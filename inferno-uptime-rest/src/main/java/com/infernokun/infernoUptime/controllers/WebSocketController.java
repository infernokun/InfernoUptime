package com.infernokun.infernoUptime.controllers;

import com.infernokun.infernoUptime.services.MonitorService;
import com.infernokun.infernoUptime.services.WebSocketNotificationService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.messaging.handler.annotation.MessageMapping;
import org.springframework.messaging.handler.annotation.SendTo;
import org.springframework.messaging.simp.annotation.SubscribeMapping;
import org.springframework.stereotype.Controller;

import java.security.Principal;
import java.util.Map;

@Slf4j
@Controller
@RequiredArgsConstructor
public class WebSocketController {

    private final MonitorService monitorService;
    private final WebSocketNotificationService webSocketService;

    @SubscribeMapping("/monitors")
    public Object onSubscribeToMonitors(Principal principal) {
        log.info("Client subscribed to monitor updates: {}",
                principal != null ? principal.getName() : "anonymous");

        // Send current dashboard summary when client subscribes
        return monitorService.getDashboardSummary();
    }

    @SubscribeMapping("/monitors/{monitorId}")
    public Object onSubscribeToMonitor(Principal principal) {
        log.info("Client subscribed to specific monitor updates: {}",
                principal != null ? principal.getName() : "anonymous");
        return Map.of("message", "Subscribed to monitor updates");
    }

    @MessageMapping("/ping")
    @SendTo("/topic/pong")
    public Object handlePing(Map<String, Object> message) {
        return Map.of(
                "message", "pong",
                "timestamp", System.currentTimeMillis(),
                "received", message
        );
    }

    @MessageMapping("/monitor/test")
    public void handleMonitorTest(Map<String, Object> testRequest, Principal principal) {
        log.info("Received monitor test request from: {}",
                principal != null ? principal.getName() : "anonymous");

        // This could trigger a manual test
        // monitorService.testMonitorConfiguration(testRequest);
    }
}