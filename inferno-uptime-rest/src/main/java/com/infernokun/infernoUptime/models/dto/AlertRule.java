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
public class AlertRule {

    private Long id;
    private String name;
    private String description;
    private AlertTrigger trigger;
    private AlertAction action;
    private Boolean isActive;
    private LocalDateTime createdAt;
    private LocalDateTime lastTriggered;
}
