package com.infernokun.infernoUptime.services;

import com.infernokun.infernoUptime.models.entity.Monitor;
import com.infernokun.infernoUptime.models.entity.MonitorCheck;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.web.reactive.function.client.WebClient;

import java.util.Map;

@Slf4j
@Service
@RequiredArgsConstructor
public class WebhookService {

    private final WebClient.Builder webClientBuilder;

    public void sendMonitorAlert(Monitor monitor, MonitorCheck check, String message) {
        // This would send to configured webhook URLs
        log.info("WEBHOOK ALERT: {}", message);

        Map<String, Object> payload = Map.of(
                "monitor_id", monitor.getId(),
                "monitor_name", monitor.getName(),
                "monitor_url", monitor.getUrl(),
                "status", check.getIsUp() ? "UP" : "DOWN",
                "response_time", check.getResponseTime(),
                "status_code", check.getStatusCode(),
                "message", message,
                "timestamp", check.getTimestamp().toString()
        );

        // Example webhook call (would be configurable)
        try {
            // webClient.post()
            //     .uri("https://hooks.slack.com/services/...")
            //     .bodyValue(payload)
            //     .retrieve()
            //     .bodyToMono(String.class)
            //     .block();

            log.info("Webhook payload prepared: {}", payload);
        } catch (Exception e) {
            log.error("Failed to send webhook: {}", e.getMessage());
        }
    }
}