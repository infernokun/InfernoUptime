package com.infernokun.infernoUptime.models.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;
import java.util.List;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class UptimeReport {

    private String reportId;
    private ReportType type;
    private LocalDateTime generatedAt;
    private LocalDateTime periodStart;
    private LocalDateTime periodEnd;

    private List<MonitorUptimeReport> monitorReports;
    private OverallUptimeStats overallStats;
    private List<IncidentSummary> incidents;
}
