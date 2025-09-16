package com.infernokun.infernoUptime.services;

import com.infernokun.infernoUptime.models.dto.DashboardSummary;
import com.infernokun.infernoUptime.models.dto.MonitorResponse;
import com.infernokun.infernoUptime.models.entity.Monitor;
import com.infernokun.infernoUptime.repositories.MonitorCheckRepository;
import com.infernokun.infernoUptime.repositories.MonitorRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;

import java.time.LocalDateTime;
import java.util.List;

@Slf4j
@Service
@RequiredArgsConstructor
public class DashboardService {

    private final MonitorRepository monitorRepository;
    private final MonitorCheckRepository monitorCheckRepository;
    private final MonitorMapperService monitorMapper; // Changed from MonitorMapper
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
        Double averageResponseTime = calculateAverageResponseTime(dayAgo);

        // Get total checks for different periods
        LocalDateTime startOfDay = LocalDateTime.now().withHour(0).withMinute(0).withSecond(0);
        Long totalChecksToday = monitorCheckRepository.countChecksAfter(startOfDay);

        LocalDateTime startOfWeek = LocalDateTime.now().minusDays(7);
        Long totalChecksThisWeek = monitorCheckRepository.countChecksThisWeek(startOfWeek);

        LocalDateTime startOfMonth = LocalDateTime.now().withDayOfMonth(1).withHour(0).withMinute(0).withSecond(0);
        Long totalChecksThisMonth = monitorCheckRepository.countChecksThisMonth(startOfMonth);

        // Get recently down monitors (limit to 5)
        List<Monitor> recentlyDownMonitors = monitorRepository.findRecentlyDownMonitors(
                Pageable.ofSize(5)
        );
        List<MonitorResponse> recentlyDown = monitorMapper.toResponseList(recentlyDownMonitors);

        // Get slowest and fastest monitors
        List<Monitor> slowestMonitorsList = monitorRepository.findSlowestMonitors(5);
        List<MonitorResponse> slowestMonitors = monitorMapper.toResponseList(slowestMonitorsList);

        List<Monitor> fastestMonitorsList = monitorRepository.findFastestMonitors(5);
        List<MonitorResponse> fastestMonitors = monitorMapper.toResponseList(fastestMonitorsList);

        DashboardSummary summary = monitorMapper.createDashboardSummary(
                totalMonitors, activeMonitors, monitorsUp, monitorsDown, monitorsPending,
                overallUptime, averageResponseTime, totalChecksToday, totalChecksThisWeek, totalChecksThisMonth,
                recentlyDown, slowestMonitors, fastestMonitors
        );

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

        return totalChecks > 0 ? (successfulChecks / totalChecks) * 100 : 100.0;
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

    // Additional helper methods for dashboard components
    public List<MonitorResponse> getRecentlyDownMonitors() {
        List<Monitor> downMonitors = monitorRepository.findByCurrentStatusAndIsActiveTrue(
                Monitor.MonitorStatus.DOWN);

        return downMonitors.stream()
                .limit(5)
                .map(monitorMapper::toResponse)
                .toList();
    }

    public List<MonitorResponse> getSlowestMonitors() {
        List<Monitor> slowMonitors = monitorRepository.findSlowestMonitors(5);
        return monitorMapper.toResponseList(slowMonitors);
    }

    public List<MonitorResponse> getFastestMonitors() {
        List<Monitor> fastMonitors = monitorRepository.findFastestMonitors(5);
        return monitorMapper.toResponseList(fastMonitors);
    }

    // Performance metrics
    public Double getOverallUptimeForPeriod(int days) {
        LocalDateTime since = LocalDateTime.now().minusDays(days);
        return calculateOverallUptime(since);
    }

    public Double getAverageResponseTimeForPeriod(int days) {
        LocalDateTime since = LocalDateTime.now().minusDays(days);
        return calculateAverageResponseTime(since);
    }

    // Count methods for dashboard widgets
    public Long getTotalChecksForPeriod(int days) {
        LocalDateTime since = LocalDateTime.now().minusDays(days);
        return monitorCheckRepository.countChecksAfter(since);
    }

    public Long getFailedChecksForPeriod(int days) {
        LocalDateTime since = LocalDateTime.now().minusDays(days);
        return monitorCheckRepository.countFailedChecks(since);
    }

    // Real-time status counts
    public void refreshDashboardCache() {
        log.info("Refreshing dashboard cache");
        cacheService.evictAllCaches();
        getDashboardSummary(); // This will rebuild the cache
    }
}