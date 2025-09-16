package com.infernokun.infernoUptime.services;

import com.infernokun.infernoUptime.exceptions.ResourceNotFoundException;
import com.infernokun.infernoUptime.models.dto.*;
import com.infernokun.infernoUptime.models.entity.Monitor;
import com.infernokun.infernoUptime.models.entity.MonitorCheck;
import com.infernokun.infernoUptime.repositories.MonitorRepository;
import com.infernokun.infernoUptime.repositories.MonitorCheckRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;
import java.util.Optional;
import java.util.concurrent.CompletableFuture;
import java.util.concurrent.TimeUnit;

@Slf4j
@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class MonitorService {

    private final MonitorRepository monitorRepository;
    private final MonitorCheckRepository monitorCheckRepository;
    private final MonitorCheckService monitorCheckService;
    private final MonitorMapperService monitorMapper; // Changed to MonitorMapperService
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
        addLatestCheckInfo(response, monitor);

        return response;
    }

    public Page<MonitorResponse> getAllMonitors(Pageable pageable, String search, Monitor.MonitorStatus status) {
        Page<Monitor> monitors;

        // Use the optimized query that handles both search and status filtering
        if ((search != null && !search.trim().isEmpty()) || status != null) {
            monitors = monitorRepository.findMonitorsWithFilters(search, status, pageable);
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

        return monitorMapper.toResponseList(monitors);
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

        return monitorMapper.createMonitorStats(
                id, monitor.getName(), totalChecks, successfulChecks, avgResponseTime, days);
    }

    public List<MonitorCheck> getMonitorChecks(Long id, int limit) {
        return monitorCheckRepository.findRecentChecksByMonitorId(id, limit);
    }

    // Manual check trigger
    public CompletableFuture<String> runManualCheck(Long id) {
        log.info("Running manual check for monitor ID: {}", id);

        return monitorCheckService.triggerImmediateCheck(id)
                .thenApply(check -> String.format("Check completed for monitor ID %d. Status: %s, Response time: %dms",
                        id, check.getIsUp() ? "UP" : "DOWN", check.getResponseTime()))
                .exceptionally(throwable -> {
                    log.error("Manual check failed for monitor ID: {}", id, throwable);
                    return "Manual check failed: " + throwable.getMessage();
                });
    }

    // Dashboard summary
    public DashboardSummary getDashboardSummary() {
        Long totalMonitors = monitorRepository.count();
        Long activeMonitors = monitorRepository.countByIsActiveTrue();
        Long monitorsUp = monitorRepository.countByStatus(Monitor.MonitorStatus.UP);
        Long monitorsDown = monitorRepository.countByStatus(Monitor.MonitorStatus.DOWN);
        Long monitorsPending = monitorRepository.countByStatus(Monitor.MonitorStatus.PENDING);

        // Calculate metrics
        LocalDateTime dayAgo = LocalDateTime.now().minusDays(1);
        Double overallUptime = monitorCheckService.calculateOverallUptimePercentage(dayAgo);
        Double averageResponseTime = monitorCheckRepository.findOverallAverageResponseTime(dayAgo);

        // Get check counts
        Long totalChecksToday = monitorCheckService.getTotalChecksToday();
        Long totalChecksThisWeek = monitorCheckService.getTotalChecksThisWeek();
        Long totalChecksThisMonth = monitorCheckService.getTotalChecksThisMonth();

        // Get monitor lists
        List<Monitor> recentlyDownMonitors = monitorRepository.findRecentlyDownMonitors(Pageable.ofSize(5));
        List<MonitorResponse> recentlyDown = monitorMapper.toResponseList(recentlyDownMonitors);

        List<Monitor> slowestMonitorsList = monitorRepository.findSlowestMonitors(5);
        List<MonitorResponse> slowestMonitors = monitorMapper.toResponseList(slowestMonitorsList);

        List<Monitor> fastestMonitorsList = monitorRepository.findFastestMonitors(5);
        List<MonitorResponse> fastestMonitors = monitorMapper.toResponseList(fastestMonitorsList);

        return monitorMapper.createDashboardSummary(
                totalMonitors, activeMonitors, monitorsUp, monitorsDown, monitorsPending,
                overallUptime, averageResponseTime, totalChecksToday, totalChecksThisWeek, totalChecksThisMonth,
                recentlyDown, slowestMonitors, fastestMonitors
        );
    }

    // Test monitor configuration
    public MonitorTestResult testMonitorConfiguration(MonitorTestRequest request) {
        log.info("Testing monitor configuration: {}", request.getUrl());

        try {
            // Create a temporary monitor for testing
            Monitor testMonitor = new Monitor();
            testMonitor.setUrl(request.getUrl());
            testMonitor.setType(request.getType());
            testMonitor.setTimeoutSeconds(request.getTimeoutSeconds());
            testMonitor.setExpectedStatusCodes(request.getExpectedStatusCodes());
            testMonitor.setKeywordCheck(request.getKeywordCheck());
            testMonitor.setCustomHeaders(request.getCustomHeaders());

            // Perform the test check
            CompletableFuture<MonitorCheck> checkFuture = monitorCheckService.performCheck(testMonitor);
            MonitorCheck result = checkFuture.get(request.getTimeoutSeconds() + 5, TimeUnit.SECONDS);

            return monitorMapper.checkToTestResult(result);

        } catch (Exception e) {
            return MonitorTestResult.builder()
                    .success(false)
                    .responseTime(0L)
                    .message("Test failed: " + e.getMessage())
                    .errorDetails(e.getClass().getSimpleName() + ": " + e.getMessage())
                    .timestamp(LocalDateTime.now())
                    .build();
        }
    }

    // Bulk operations
    @Transactional
    public BulkOperationResult createMonitorsBulk(BulkMonitorRequest request) {
        log.info("Creating {} monitors in bulk", request.getMonitors().size());

        List<String> errors = new ArrayList<>();
        List<MonitorResponse> createdMonitors = new ArrayList<>();
        int successful = 0;
        int failed = 0;
        int skipped = 0;

        for (MonitorCreateRequest monitorRequest : request.getMonitors()) {
            try {
                // Check for duplicates if requested
                if (request.getSkipDuplicates()) {
                    List<Monitor> existing = monitorRepository.findActiveMonitorsByUrl(monitorRequest.getUrl());
                    if (!existing.isEmpty()) {
                        skipped++;
                        continue;
                    }
                }

                // Validate URL if requested
                if (request.getValidateUrls()) {
                    if (!monitorMapper.isValidUrl(monitorRequest.getUrl())) {
                        errors.add("Invalid URL: " + monitorRequest.getUrl());
                        failed++;
                        continue;
                    }
                }

                MonitorResponse created = createMonitor(monitorRequest);
                createdMonitors.add(created);
                successful++;

            } catch (Exception e) {
                errors.add("Failed to create monitor '" + monitorRequest.getName() + "': " + e.getMessage());
                failed++;
            }
        }

        return monitorMapper.createBulkResult(
                request.getMonitors().size(), successful, failed, skipped, errors, createdMonitors
        );
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