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
public class MonitorTestResult {

    private Boolean success;
    private Long responseTime;
    private Integer statusCode;
    private String message;
    private String errorDetails;
    private LocalDateTime timestamp;
    private Long contentLength;
    private String contentType;
    private Boolean keywordFound;
    private Integer redirectCount;
    private String finalUrl;
}
