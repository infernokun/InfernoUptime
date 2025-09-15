package com.infernokun.infernoUptime.services;

import com.infernokun.infernoUptime.models.entity.Monitor;
import com.infernokun.infernoUptime.models.entity.MonitorCheck;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

import java.util.List;

@Slf4j
@Service
@RequiredArgsConstructor
public class NotificationService {

    @Value("${inferno.uptime.notifications.enabled:true}")
    private boolean notificationsEnabled;

    @Value("${inferno.uptime.notifications.email.enabled:false}")
    private boolean emailNotificationsEnabled;

    @Value("${inferno.uptime.notifications.webhook.enabled:true}")
    private boolean webhookNotificationsEnabled;

    private final EmailService emailService;
    private final WebhookService webhookService;

    public void sendStatusChangeNotification(Monitor monitor, MonitorCheck check) {
        if (!notificationsEnabled) {
            log.debug("Notifications disabled, skipping notification for monitor: {}", monitor.getName());
            return;
        }

        String status = check.getIsUp() ? "UP" : "DOWN";
        String message = String.format("Monitor '%s' is now %s", monitor.getName(), status);

        log.info("Sending status change notification: {}", message);

        try {
            // Send email notification
            if (emailNotificationsEnabled) {
                sendEmailNotification(monitor, check, message);
            }

            // Send webhook notification
            if (webhookNotificationsEnabled) {
                sendWebhookNotification(monitor, check, message);
            }

        } catch (Exception e) {
            log.error("Error sending notifications for monitor {}: {}", monitor.getName(), e.getMessage());
        }
    }

    private void sendEmailNotification(Monitor monitor, MonitorCheck check, String message) {
        try {
            emailService.sendMonitorAlert(monitor, check, message);
        } catch (Exception e) {
            log.error("Failed to send email notification: {}", e.getMessage());
        }
    }

    private void sendWebhookNotification(Monitor monitor, MonitorCheck check, String message) {
        try {
            webhookService.sendMonitorAlert(monitor, check, message);
        } catch (Exception e) {
            log.error("Failed to send webhook notification: {}", e.getMessage());
        }
    }
}