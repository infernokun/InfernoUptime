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
public class MonitorStats {

    private Long monitorId;
    private String monitorName;
    private Long totalChecks;
    private Long successfulChecks;
    private Double uptime; // percentage
    private Double averageResponseTime;
    private Integer period; // days
    private LocalDateTime periodStart;
    private LocalDateTime periodEnd;
    private Long totalDowntime; // minutes
    private List<UptimeDataPoint> uptimeData;
}
