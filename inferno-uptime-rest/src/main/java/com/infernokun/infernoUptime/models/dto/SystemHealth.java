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
public class SystemHealth {
    private Boolean healthy;
    private String status;
    private Long activeThreads;
    private Long queuedTasks;
    private Boolean cacheHealthy;
    private Boolean databaseHealthy;
    private LocalDateTime lastUpdated;
}
