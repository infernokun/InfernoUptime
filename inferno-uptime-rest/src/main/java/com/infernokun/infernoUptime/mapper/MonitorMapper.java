package com.infernokun.infernoUptime.mapper;

import com.infernokun.infernoUptime.models.dto.*;
import com.infernokun.infernoUptime.models.entity.Monitor;
import com.infernokun.infernoUptime.models.entity.MonitorCheck;
import org.mapstruct.*;
import org.springframework.stereotype.Component;

import java.time.LocalDateTime;
import java.util.List;

@Mapper(
        componentModel = "spring",
        nullValuePropertyMappingStrategy = NullValuePropertyMappingStrategy.IGNORE,
        unmappedTargetPolicy = ReportingPolicy.IGNORE,
        imports = {LocalDateTime.class}
)
@Component
public interface MonitorMapper {

    // ======================== Monitor Entity Mapping ========================

    @Mapping(target = "id", ignore = true)
    @Mapping(target = "createdAt", ignore = true)
    @Mapping(target = "updatedAt", ignore = true)
    @Mapping(target = "lastChecked", ignore = true)
    @Mapping(target = "currentStatus", constant = "PENDING")
    @Mapping(target = "checks", ignore = true)
    @Mapping(target = "url", expression = "java(normalizeUrl(request.getUrl()))")
    Monitor toEntity(MonitorCreateRequest request);

    @Mapping(target = "lastResponseTime", ignore = true)
    @Mapping(target = "lastStatusCode", ignore = true)
    @Mapping(target = "lastCheckMessage", ignore = true)
    @Mapping(target = "uptimePercentage", ignore = true)
    @Mapping(target = "statusDisplay", expression = "java(getStatusDisplay(monitor))")
    MonitorResponse toResponse(Monitor monitor);

    @BeanMapping(nullValuePropertyMappingStrategy = NullValuePropertyMappingStrategy.IGNORE)
    @Mapping(target = "id", ignore = true)
    @Mapping(target = "createdAt", ignore = true)
    @Mapping(target = "updatedAt", ignore = true)
    @Mapping(target = "lastChecked", ignore = true)
    @Mapping(target = "currentStatus", ignore = true)
    @Mapping(target = "checks", ignore = true)
    @Mapping(target = "url", expression = "java(normalizeUrl(request.getUrl()))")
    void updateEntity(@MappingTarget Monitor monitor, MonitorUpdateRequest request);

    // ======================== Monitor Check Mapping ========================

    @Mapping(target = "timestamp", expression = "java(LocalDateTime.now())")
    UptimeDataPoint checkToDataPoint(MonitorCheck check);

    List<UptimeDataPoint> checksToDataPoints(List<MonitorCheck> checks);

    // ======================== Statistics Mapping ========================

    @Mapping(target = "uptimeData", ignore = true)
    @Mapping(target = "totalDowntime", ignore = true)
    @Mapping(target = "periodStart", ignore = true)
    @Mapping(target = "periodEnd", ignore = true)
    MonitorStats toMonitorStats(Long monitorId, String monitorName, Long totalChecks,
                                Long successfulChecks, Double uptime, Double averageResponseTime, Integer period);

    default MonitorStats createMonitorStats(Long monitorId, String monitorName,
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

    @Mapping(target = "timestamp", expression = "java(LocalDateTime.now())")
    @Mapping(target = "keywordFound", ignore = true)
    @Mapping(target = "redirectCount", ignore = true)
    @Mapping(target = "finalUrl", ignore = true)
    @Mapping(target = "contentType", ignore = true)
    MonitorTestResult checkToTestResult(MonitorCheck check);

    // ======================== Dashboard Mapping ========================

    default DashboardSummary createDashboardSummary(Long totalMonitors, Long activeMonitors,
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

    // ======================== Bulk Operations Mapping ========================

    List<Monitor> createRequestsToEntities(List<MonitorCreateRequest> requests);

    default BulkOperationResult createBulkResult(Integer totalRequested, Integer successful,
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

    // ======================== Utility Methods ========================

    default String normalizeUrl(String url) {
        if (url == null || url.trim().isEmpty()) {
            return url;
        }

        String normalized = url.trim();

        // Add http:// if no protocol specified
        if (!normalized.startsWith("http://") && !normalized.startsWith("https://")) {
            normalized = "http://" + normalized;
        }

        // Remove trailing slash unless it's the root
        if (normalized.endsWith("/") && normalized.length() > 8) { // "https://".length() = 8
            normalized = normalized.substring(0, normalized.length() - 1);
        }

        return normalized;
    }

    default String getStatusDisplay(Monitor monitor) {
        if (monitor == null || monitor.getCurrentStatus() == null) {
            return "Unknown";
        }

        return switch (monitor.getCurrentStatus()) {
            case UP -> " Up";
            case DOWN -> " Down";
            case PENDING -> " Pending";
            case MAINTENANCE -> " Maintenance";
        };
    }

    default Long calculateDowntime(Long totalChecks, Long successfulChecks) {
        if (totalChecks == null || successfulChecks == null || totalChecks == 0) {
            return 0L;
        }

        // Assuming average check interval of 60 seconds for downtime calculation
        return totalChecks - successfulChecks; // 1 minute per failed check (approximate)
    }

    default SystemHealth createSystemHealth() {
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

    // ======================== String Utility Methods ========================

    default String map(String value) {
        return value != null && !value.trim().isEmpty() ? value.trim() : null;
    }

    default String sanitizeString(String input) {
        if (input == null) {
            return null;
        }

        return input.trim()
                .replaceAll("[\\r\\n\\t]", " ")
                .replaceAll("\\s+", " ");
    }

    // ======================== Notification Mapping ========================

    default NotificationSettings createDefaultNotificationSettings(Long monitorId) {
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

    // ======================== Report Mapping ========================

    default MonitorUptimeReport createUptimeReport(Monitor monitor, MonitorStats stats,
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

    // ======================== List Conversion Methods ========================

    List<MonitorResponse> monitorsToResponses(List<Monitor> monitors);

    List<Monitor> responsesToMonitors(List<MonitorResponse> responses);

    // ======================== Validation Helper Methods ========================

    default boolean isValidEmail(String email) {
        if (email == null || email.trim().isEmpty()) {
            return false;
        }
        return email.matches("^[A-Za-z0-9+_.-]+@([A-Za-z0-9.-]+\\.[A-Za-z]{2,})$");
    }

    default boolean isValidUrl(String url) {
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