package com.infernokun.infernoUptime.services;

import com.infernokun.infernoUptime.models.entity.Monitor;
import com.infernokun.infernoUptime.models.entity.MonitorCheck;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.stereotype.Service;

import java.time.LocalDateTime;

@Slf4j
@Service
@RequiredArgsConstructor
public class WebSocketNotificationService {

    private final SimpMessagingTemplate messagingTemplate;
    private final MonitorMapper monitorMapper;

    public void sendMonitorUpdate(Monitor monitor, MonitorCheck check) {
        try {
            MonitorUpdateNotification notification = MonitorUpdateNotification.builder()
                    .monitorId(monitor.getId())
                    .monitorName(monitor.getName())
                    .url(monitor.getUrl())
                    .status(monitor.getCurrentStatus())
                    .isUp(check.getIsUp())
                    .responseTime(check.getResponseTime())
                    .statusCode(check.getStatusCode())
                    .message(check.getMessage())
                    .timestamp(check.getTimestamp())
                    .build();

            // Send to all subscribers of monitor updates
            messagingTemplate.convertAndSend("/topic/monitors/updates", notification);

            // Send to subscribers of specific monitor
            messagingTemplate.convertAndSend("/topic/monitors/" + monitor.getId(), notification);

            log.debug("Sent WebSocket notification for monitor: {} ({})", monitor.getName(), monitor.getCurrentStatus());

        } catch (Exception e) {
            log.error("Error sending WebSocket notification for monitor {}: {}", monitor.getId(), e.getMessage());
        }
    }

    public void sendDashboardUpdate(Object dashboardData) {
        try {
            messagingTemplate.convertAndSend("/topic/dashboard", dashboardData);
            log.debug("Sent dashboard update notification");
        } catch (Exception e) {
            log.error("Error sending dashboard update notification: {}", e.getMessage());
        }
    }

    public void sendSystemAlert(String message, AlertLevel level) {
        try {
            SystemAlert alert = SystemAlert.builder()
                    .message(message)
                    .level(level)
                    .timestamp(LocalDateTime.now())
                    .build();

            messagingTemplate.convertAndSend("/topic/alerts", alert);
            log.info("Sent system alert: {} ({})", message, level);
        } catch (Exception e) {
            log.error("Error sending system alert: {}", e.getMessage());
        }
    }

    public void sendToUser(String username, String destination, Object message) {
        try {
            messagingTemplate.convertAndSendToUser(username, destination, message);
            log.debug("Sent message to user: {} at destination: {}", username, destination);
        } catch (Exception e) {
            log.error("Error sending message to user {}: {}", username, e.getMessage());
        }
    }

    // Notification DTOs
    @lombok.Data
    @lombok.Builder
    @lombok.AllArgsConstructor
    @lombok.NoArgsConstructor
    public static class MonitorUpdateNotification {
        private Long monitorId;
        private String monitorName;
        private String url;
        private Monitor.MonitorStatus status;
        private Boolean isUp;
        private Long responseTime;
        private Integer statusCode;
        private String message;
        private LocalDateTime timestamp;
    }

    @lombok.Data
    @lombok.Builder
    @lombok.AllArgsConstructor
    @lombok.NoArgsConstructor
    public static class SystemAlert {
        private String message;
        private AlertLevel level;
        private LocalDateTime timestamp;
    }

    public enum AlertLevel {
        INFO, WARNING, ERROR, CRITICAL
    }
}