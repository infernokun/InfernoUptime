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
public class StatusHistoryPoint {
    private LocalDateTime timestamp;
    private Long monitorsUp;
    private Long monitorsDown;
    private Double averageResponseTime;
}
