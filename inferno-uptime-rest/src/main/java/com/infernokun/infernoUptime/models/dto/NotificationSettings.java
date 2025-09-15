package com.infernokun.infernoUptime.models.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class NotificationSettings {

    private Long monitorId;
    private Boolean emailEnabled;
    private Boolean webhookEnabled;
    private Boolean slackEnabled;
    private String emailRecipients; // comma-separated
    private String webhookUrl;
    private String slackChannel;
    private Boolean notifyOnDown;
    private Boolean notifyOnUp;
    private Boolean notifyOnSlow;
    private Integer slowThresholdMs;
    private Integer escalationDelayMinutes;
}
