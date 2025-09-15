package com.infernokun.infernoUptime.models.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class MonitorUptimeReport {

    private Long monitorId;
    private String monitorName;
    private String url;
    private Double uptimePercentage;
    private Long totalChecks;
    private Long successfulChecks;
    private Long failedChecks;
    private Double averageResponseTime;
    private Long totalDowntimeMinutes;
    private Integer incidentCount;
    private LocalDateTime longestOutageStart;
    private LocalDateTime longestOutageEnd;
    private Long longestOutageDuration; // minutes
}
