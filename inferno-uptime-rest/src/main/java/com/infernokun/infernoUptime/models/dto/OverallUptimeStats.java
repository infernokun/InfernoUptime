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
public class OverallUptimeStats {

    private Double overallUptime;
    private Double averageResponseTime;
    private Long totalChecks;
    private Long totalIncidents;
    private Long totalDowntimeMinutes;
    private Integer monitorsCount;
    private LocalDateTime worstOutageStart;
    private LocalDateTime worstOutageEnd;
}
