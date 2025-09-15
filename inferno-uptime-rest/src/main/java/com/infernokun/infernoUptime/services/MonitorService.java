package com.infernokun.infernoUptime.services;

import com.infernokun.infernoUptime.models.dto.MonitorCreateRequest;
import com.infernokun.infernoUptime.models.dto.MonitorResponse;
import com.infernokun.infernoUptime.models.entity.Monitor;
import com.infernokun.infernoUptime.models.entity.MonitorCheck;
import com.infernokun.infernoUptime.repositories.MonitorCheckRepository;
import com.infernokun.infernoUptime.repositories.MonitorRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;

@Slf4j
@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class MonitorService {

    private final MonitorRepository monitorRepository;
    private final MonitorCheckRepository monitorCheckRepository;
    private final MonitorMapper monitorMapper;
    private final CacheService cacheService;

    @Transactional
    public MonitorResponse createMonitor(MonitorCreateRequest request) {
        log.info("Creating new monitor: {}", request.getName());

        Monitor monitor = monitorMapper.toEntity(request);
        monitor = monitorRepository.save(monitor);

        // Cache the new monitor
        cacheService.cacheMonitor(monitor);

        log.info("Created monitor with ID: {}", monitor.getId());
        return monitorMapper.toResponse(monitor);
    }

    public MonitorResponse getMonitor(Long id) {
        Monitor monitor = findMonitorById(id);
        MonitorResponse response = monitorMapper.toResponse(monitor);

        // Add latest check info
        Optional<MonitorCheck> latestCheck = monitorCheckRepository.findLatestCheckByMonitor(monitor);
        latestCheck.ifPresent(check -> {
            response.setLastResponseTime(check.getResponseTime());
            response.setLastStatusCode(check.getStatusCode());
            response.setLastCheckMessage(check.getMessage());
        });

        return response;
    }

    public Page<MonitorResponse> getAllMonitors(Pageable pageable, String search, Monitor.MonitorStatus status) {
        Page<Monitor> monitors;

        if (search != null && !search.trim().isEmpty()) {
            monitors = monitorRepository.findActiveMonitorsByNameContaining(search, pageable);
        } else if (status != null) {
            monitors = monitorRepository.findByCurrentStatusAndIsActiveTrue(status, pageable);
        } else {
            monitors = monitorRepository.findByIsActiveTrueOrderByNameAsc(pageable);
        }

        return monitors.map(monitor -> {
            MonitorResponse response = monitorMapper.toResponse(monitor);
            addLatestCheckInfo(response, monitor);
            return response;
        });
    }

    public List<MonitorResponse> getActiveMonitors() {
        List<Monitor> monitors = cacheService.getActiveMonitors();
        if (monitors.isEmpty()) {
            monitors = monitorRepository.findByIsActiveTrueOrderByNameAsc();
            cacheService.cacheActiveMonitors(monitors);
        }

        return monitors.stream()
                .map(monitorMapper::toResponse)
                .toList();
    }

    @Transactional
    public MonitorResponse updateMonitor(Long id, MonitorUpdateRequest request) {
        log.info("Updating monitor ID: {}", id);

        Monitor monitor = findMonitorById(id);
        monitorMapper.updateEntity(monitor, request);
        monitor = monitorRepository.save(monitor);

        // Update cache
        cacheService.evictMonitor(id);
        cacheService.cacheMonitor(monitor);

        log.info("Updated monitor ID: {}", id);
        return monitorMapper.toResponse(monitor);
    }

    @Transactional
    public void deleteMonitor(Long id) {
        log.info("Deleting monitor ID: {}", id);

        Monitor monitor = findMonitorById(id);
        monitor.setIsActive(false);
        monitorRepository.save(monitor);

        // Clear from cache
        cacheService.evictMonitor(id);
        cacheService.evictActiveMonitors();

        log.info("Deleted monitor ID: {}", id);
    }

    @Transactional
    public void toggleMonitorStatus(Long id) {
        Monitor monitor = findMonitorById(id);
        monitor.setIsActive(!monitor.getIsActive());
        monitorRepository.save(monitor);

        cacheService.evictMonitor(id);
        cacheService.evictActiveMonitors();

        log.info("Toggled monitor ID: {} to active: {}", id, monitor.getIsActive());
    }

    public MonitorStats getMonitorStats(Long id, int days) {
        Monitor monitor = findMonitorById(id);
        LocalDateTime since = LocalDateTime.now().minusDays(days);

        Long totalChecks = monitorCheckRepository.countTotalChecks(monitor, since);
        Long successfulChecks = monitorCheckRepository.countSuccessfulChecks(monitor, since);
        Double avgResponseTime = monitorCheckRepository.findAverageResponseTime(monitor, since);

        double uptime = totalChecks > 0 ? (successfulChecks.doubleValue() / totalChecks.doubleValue()) * 100 : 0;

        return MonitorStats.builder()
                .monitorId(id)
                .totalChecks(totalChecks)
                .successfulChecks(successfulChecks)
                .uptime(uptime)
                .averageResponseTime(avgResponseTime != null ? avgResponseTime : 0.0)
                .period(days)
                .build();
    }

    public List<MonitorCheck> getMonitorChecks(Long id, int limit) {
        Monitor monitor = findMonitorById(id);
        return monitorCheckRepository.findRecentChecksByMonitorId(id, limit);
    }

    private Monitor findMonitorById(Long id) {
        return monitorRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Monitor not found with ID: " + id));
    }

    private void addLatestCheckInfo(MonitorResponse response, Monitor monitor) {
        Optional<MonitorCheck> latestCheck = monitorCheckRepository.findLatestCheckByMonitor(monitor);
        latestCheck.ifPresent(check -> {
            response.setLastResponseTime(check.getResponseTime());
            response.setLastStatusCode(check.getStatusCode());
            response.setLastCheckMessage(check.getMessage());
        });
    }
}