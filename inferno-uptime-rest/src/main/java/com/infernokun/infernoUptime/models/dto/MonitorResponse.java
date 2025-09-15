package com.infernokun.infernoUptime.models.dto;

import com.fasterxml.jackson.annotation.JsonInclude;
import com.infernokun.infernoUptime.models.entity.Monitor;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
@JsonInclude(JsonInclude.Include.NON_NULL)
public class MonitorResponse {

    private Long id;
    private String name;
    private String url;
    private Monitor.MonitorType type;
    private Monitor.MonitorStatus currentStatus;
    private Integer checkInterval;
    private Integer timeoutSeconds;
    private Integer maxRedirects;
    private String description;
    private String expectedStatusCodes;
    private String keywordCheck;
    private String customHeaders;
    private Boolean isActive;
    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;
    private LocalDateTime lastChecked;

    // Latest check information
    private Long lastResponseTime;
    private Integer lastStatusCode;
    private String lastCheckMessage;
    private Double uptimePercentage;
    private String statusDisplay;
}
