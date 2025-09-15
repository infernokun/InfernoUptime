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
public class UptimeDataPoint {
    private LocalDateTime timestamp;
    private Boolean isUp;
    private Long responseTime;
    private Integer statusCode;
    private String message;
}
