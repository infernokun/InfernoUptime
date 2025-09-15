package com.infernokun.infernoUptime.models.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.List;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class DashboardSummary {

    private Long totalMonitors;
    private Long activeMonitors;
    private Long monitorsUp;
    private Long monitorsDown;
    private Long monitorsPending;
    private Double overallUptime;
    private Double averageResponseTime;
    private Long totalChecksToday;
    private Long totalChecksThisWeek;
    private Long totalChecksThisMonth;
    private List<MonitorResponse> recentlyDown;
    private List<MonitorResponse> slowestMonitors;
    private List<MonitorResponse> fastestMonitors;
    private List<StatusHistoryPoint> statusHistory;
    private SystemHealth systemHealth;
}
