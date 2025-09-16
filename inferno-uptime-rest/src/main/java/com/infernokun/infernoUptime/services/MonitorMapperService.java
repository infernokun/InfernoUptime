package com.infernokun.infernoUptime.services;

import com.infernokun.infernoUptime.models.dto.*;
import com.infernokun.infernoUptime.models.entity.Monitor;
import com.infernokun.infernoUptime.models.entity.MonitorCheck;
import lombok.RequiredArgsConstructor;
import org.modelmapper.ModelMapper;
import org.springframework.stereotype.Service;

import java.time.LocalDateTime;
import java.util.List;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class MonitorMapperService {

    private final ModelMapper modelMapper;

    // ======================== Monitor Entity Mapping ========================

    public Monitor toEntity(MonitorCreateRequest request) {
        Monitor monitor = modelMapper.map(request, Monitor.class);

        // Set defaults and normalize data
        monitor.setUrl(normalizeUrl(request.getUrl()));
        monitor.setCurrentStatus(Monitor.MonitorStatus.PENDING);
        monitor.setIsActive(request.getIsActive() != null ? request.getIsActive() : true);

        return monitor;
    }

    public MonitorResponse toResponse(Monitor monitor) {
        MonitorResponse response = modelMapper.map(monitor, MonitorResponse.class);
        response.setStatusDisplay(getStatusDisplay(monitor));
        return response;
    }

    public void updateEntity(Monitor monitor, MonitorUpdateRequest request) {
        // Only map non-null values from request to entity
        modelMapper.map(request, monitor);

        if (request.getUrl() != null) {
            monitor.setUrl(normalizeUrl(request.getUrl()));
        }
    }

    public List<MonitorResponse> toResponseList(List<Monitor> monitors) {
        return monitors.stream()
                .map(this::toResponse)
                .collect(Collectors.toList());
    }

    // ======================== Monitor Check Mapping ========================

    public UptimeDataPoint checkToDataPoint(MonitorCheck check) {
        UptimeDataPoint dataPoint = modelMapper.map(check, UptimeDataPoint.class);
        dataPoint.setTimestamp(LocalDateTime.parse(check.getTimestamp().toString()));
        return dataPoint;
    }

    public List<UptimeDataPoint> checksToDataPoints(List<MonitorCheck> checks) {
        return checks.stream()
                .map(this::checkToDataPoint)
                .collect(Collectors.toList());
    }

    // ======================== Statistics Building ========================

    public MonitorStats createMonitorStats(Long monitorId, String monitorName,
                                           Long totalChecks, Long successfulChecks,
                                           Double averageResponseTime, Integer period) {
        Double uptime = totalChecks > 0 ? (successfulChecks.doubleValue() / totalChecks.doubleValue()) * 100 : 0.0;

        return MonitorStats.builder()
                .monitorId(monitorId)
                .monitorName(monitorName)
                .totalChecks(totalChecks)
                .successfulChecks(successfulChecks)
                .uptime(uptime)
                .averageResponseTime(averageResponseTime != null ? averageResponseTime : 0.0)
                .period(period)
                .periodStart(LocalDateTime.now().minusDays(period))
                .periodEnd(LocalDateTime.now())
                .totalDowntime(calculateDowntime(totalChecks, successfulChecks))
                .build();
    }

    // ======================== Test Result Mapping ========================

    public MonitorTestResult checkToTestResult(MonitorCheck check) {
        MonitorTestResult result = modelMapper.map(check, MonitorTestResult.class);
        result.setTimestamp(LocalDateTime.now());
        return result;
    }

    // ======================== Dashboard Building ========================

    public DashboardSummary createDashboardSummary(Long totalMonitors, Long activeMonitors,
                                                   Long monitorsUp, Long monitorsDown, Long monitorsPending,
                                                   Double overallUptime, Double averageResponseTime,
                                                   Long totalChecksToday, Long totalChecksThisWeek, Long totalChecksThisMonth,
                                                   List<MonitorResponse> recentlyDown, List<MonitorResponse> slowestMonitors,
                                                   List<MonitorResponse> fastestMonitors) {
        return DashboardSummary.builder()
                .totalMonitors(totalMonitors)
                .activeMonitors(activeMonitors)
                .monitorsUp(monitorsUp)
                .monitorsDown(monitorsDown)
                .monitorsPending(monitorsPending)
                .overallUptime(overallUptime != null ? overallUptime : 0.0)
                .averageResponseTime(averageResponseTime != null ? averageResponseTime : 0.0)
                .totalChecksToday(totalChecksToday)
                .totalChecksThisWeek(totalChecksThisWeek)
                .totalChecksThisMonth(totalChecksThisMonth)
                .recentlyDown(recentlyDown)
                .slowestMonitors(slowestMonitors)
                .fastestMonitors(fastestMonitors)
                .systemHealth(createSystemHealth())
                .build();
    }

    // ======================== Bulk Operations ========================

    public List<Monitor> createRequestsToEntities(List<MonitorCreateRequest> requests) {
        return requests.stream()
                .map(this::toEntity)
                .collect(Collectors.toList());
    }

    public BulkOperationResult createBulkResult(Integer totalRequested, Integer successful,
                                                Integer failed, Integer skipped,
                                                List<String> errors, List<MonitorResponse> createdMonitors) {
        return BulkOperationResult.builder()
                .totalRequested(totalRequested)
                .successful(successful)
                .failed(failed)
                .skipped(skipped)
                .errors(errors)
                .createdMonitors(createdMonitors)
                .completedAt(LocalDateTime.now())
                .build();
    }

    // ======================== Report Building ========================

    public MonitorUptimeReport createUptimeReport(Monitor monitor, MonitorStats stats,
                                                  List<IncidentSummary> incidents) {
        IncidentSummary longestOutage = incidents.stream()
                .max((i1, i2) -> Long.compare(i1.getDurationMinutes(), i2.getDurationMinutes()))
                .orElse(null);

        return MonitorUptimeReport.builder()
                .monitorId(monitor.getId())
                .monitorName(monitor.getName())
                .url(monitor.getUrl())
                .uptimePercentage(stats.getUptime())
                .totalChecks(stats.getTotalChecks())
                .successfulChecks(stats.getSuccessfulChecks())
                .failedChecks(stats.getTotalChecks() - stats.getSuccessfulChecks())
                .averageResponseTime(stats.getAverageResponseTime())
                .totalDowntimeMinutes(stats.getTotalDowntime())
                .incidentCount(incidents.size())
                .longestOutageStart(longestOutage != null ? longestOutage.getStartTime() : null)
                .longestOutageEnd(longestOutage != null ? longestOutage.getEndTime() : null)
                .longestOutageDuration(longestOutage != null ? longestOutage.getDurationMinutes() : 0L)
                .build();
    }

    // ======================== Notification Building ========================

    public NotificationSettings createDefaultNotificationSettings(Long monitorId) {
        return NotificationSettings.builder()
                .monitorId(monitorId)
                .emailEnabled(false)
                .webhookEnabled(true)
                .slackEnabled(false)
                .notifyOnDown(true)
                .notifyOnUp(true)
                .notifyOnSlow(false)
                .slowThresholdMs(5000)
                .escalationDelayMinutes(5)
                .build();
    }

    // ======================== Utility Methods ========================

    private String normalizeUrl(String url) {
        if (url == null || url.trim().isEmpty()) {
            return url;
        }

        String normalized = url.trim();

        // Add http:// if no protocol specified
        if (!normalized.startsWith("http://") && !normalized.startsWith("https://")) {
            normalized = "http://" + normalized;
        }

        // Remove trailing slash unless it's the root
        if (normalized.endsWith("/") && normalized.length() > 8) {
            normalized = normalized.substring(0, normalized.length() - 1);
        }

        return normalized;
    }

    private String getStatusDisplay(Monitor monitor) {
        if (monitor == null || monitor.getCurrentStatus() == null) {
            return "Unknown";
        }

        return switch (monitor.getCurrentStatus()) {
            case UP -> "🟢 Up";
            case DOWN -> "🔴 Down";
            case PENDING -> "🟡 Pending";
            case MAINTENANCE -> "🔧 Maintenance";
        };
    }

    private Long calculateDowntime(Long totalChecks, Long successfulChecks) {
        if (totalChecks == null || successfulChecks == null || totalChecks == 0) {
            return 0L;
        }

        Long failedChecks = totalChecks - successfulChecks;
        return failedChecks; // 1 minute per failed check (approximate)
    }

    private SystemHealth createSystemHealth() {
        return SystemHealth.builder()
                .healthy(true)
                .status("OK")
                .activeThreads(0L)
                .queuedTasks(0L)
                .cacheHealthy(true)
                .databaseHealthy(true)
                .lastUpdated(LocalDateTime.now())
                .build();
    }

    // ======================== Validation Helpers ========================

    public boolean isValidEmail(String email) {
        if (email == null || email.trim().isEmpty()) {
            return false;
        }
        return email.matches("^[A-Za-z0-9+_.-]+@([A-Za-z0-9.-]+\\.[A-Za-z]{2,})$");
    }

    public boolean isValidUrl(String url) {
        if (url == null || url.trim().isEmpty()) {
            return false;
        }

        try {
            java.net.URI uri = new java.net.URI(url);
            return uri.getScheme() != null &&
                    (uri.getScheme().equals("http") || uri.getScheme().equals("https")) &&
                    uri.getHost() != null;
        } catch (Exception e) {
            return false;
        }
    }
}