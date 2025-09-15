package com.infernokun.infernoUptime.services;

import com.infernokun.infernoUptime.models.entity.Monitor;
import com.infernokun.infernoUptime.repositories.MonitorCheckRepository;
import com.infernokun.infernoUptime.repositories.MonitorRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;

import java.time.LocalDateTime;
import java.util.List;

@Slf4j
@Service
@RequiredArgsConstructor
public class DashboardService {

    private final MonitorRepository monitorRepository;
    private final MonitorCheckRepository monitorCheckRepository;
    private final MonitorMapper monitorMapper;
    private final CacheService cacheService;

    public DashboardSummary getDashboardSummary() {
        // Try to get from cache first
        DashboardSummary cached = (DashboardSummary) cacheService.getDashboardSummary();
        if (cached != null) {
            return cached;
        }

        log.debug("Generating dashboard summary");

        Long totalMonitors = monitorRepository.count();
        Long activeMonitors = monitorRepository.countByIsActiveTrue();
        Long monitorsUp = monitorRepository.countByStatus(Monitor.MonitorStatus.UP);
        Long monitorsDown = monitorRepository.countByStatus(Monitor.MonitorStatus.DOWN);
        Long monitorsPending = monitorRepository.countByStatus(Monitor.MonitorStatus.PENDING);

        // Calculate overall uptime for last 24 hours
        LocalDateTime dayAgo = LocalDateTime.now().minusDays(1);
        Double overallUptime = calculateOverallUptime(dayAgo);

        // Calculate average response time for last 24 hours
        Double averageResponseTime = calculateAverageResponseTime(dayAgo);

        // Get total checks today
        LocalDateTime startOfDay = LocalDateTime.now().withHour(0).withMinute(0).withSecond(0);
        Long totalChecksToday = monitorCheckRepository.countChecksAfter(startOfDay);

        // Get recently down monitors
        List<MonitorResponse> recentlyDown = getRecentlyDownMonitors();

        // Get slowest monitors
        List<MonitorResponse> slowestMonitors = getSlowestMonitors();

        DashboardSummary summary = DashboardSummary.builder()
                .totalMonitors(totalMonitors)
                .activeMonitors(activeMonitors)
                .monitorsUp(monitorsUp)
                .monitorsDown(monitorsDown)
                .monitorsPending(monitorsPending)
                .overallUptime(overallUptime)
                .averageResponseTime(averageResponseTime)
                .totalChecksToday(totalChecksToday)
                .recentlyDown(recentlyDown)
                .slowestMonitors(slowestMonitors)
                .build();

        // Cache the result
        cacheService.cacheDashboardSummary(summary);

        return summary;
    }

    private Double calculateOverallUptime(LocalDateTime since) {
        List<Monitor> activeMonitors = monitorRepository.findByIsActiveTrue();
        if (activeMonitors.isEmpty()) {
            return 100.0;
        }

        long totalChecks = 0;
        long successfulChecks = 0;

        for (Monitor monitor : activeMonitors) {
            Long monitorTotal = monitorCheckRepository.countTotalChecks(monitor, since);
            Long monitorSuccessful = monitorCheckRepository.countSuccessfulChecks(monitor, since);

            totalChecks += monitorTotal;
            successfulChecks += monitorSuccessful;
        }

        return totalChecks > 0 ? (successfulChecks.doubleValue() / totalChecks.doubleValue()) * 100 : 100.0;
    }

    private Double calculateAverageResponseTime(LocalDateTime since) {
        List<Monitor> activeMonitors = monitorRepository.findByIsActiveTrue();
        if (activeMonitors.isEmpty()) {
            return 0.0;
        }

        double totalResponseTime = 0.0;
        int monitorCount = 0;

        for (Monitor monitor : activeMonitors) {
            Double avgResponseTime = monitorCheckRepository.findAverageResponseTime(monitor, since);
            if (avgResponseTime != null && avgResponseTime > 0) {
                totalResponseTime += avgResponseTime;
                monitorCount++;
            }
        }

        return monitorCount > 0 ? totalResponseTime / monitorCount : 0.0;
    }

    private List<MonitorResponse> getRecentlyDownMonitors() {
        List<Monitor> downMonitors = monitorRepository.findByCurrentStatusAndIsActiveTrue(
                Monitor.MonitorStatus.DOWN);

        return downMonitors.stream()
                .limit(5)
                .map(monitorMapper::toResponse)
                .toList();
    }

    private List<MonitorResponse> getSlowestMonitors() {
        // This would need a custom query to get monitors with highest average response times
        List<Monitor> slowMonitors = monitorRepository.findSlowestMonitors(5);

        return slowMonitors.stream()
                .map(monitorMapper::toResponse)
                .toList();
    }
}