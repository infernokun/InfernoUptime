package com.infernokun.infernoUptime.services;

import com.infernokun.infernoUptime.models.entity.Monitor;
import com.infernokun.infernoUptime.models.entity.MonitorCheck;
import com.infernokun.infernoUptime.repositories.MonitorCheckRepository;
import com.infernokun.infernoUptime.repositories.MonitorRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.scheduling.annotation.Async;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.reactive.function.client.WebClient;
import org.springframework.web.reactive.function.client.WebClientResponseException;
import reactor.core.publisher.Mono;
import reactor.util.retry.Retry;

import javax.net.ssl.SSLSession;
import java.net.URI;
import java.time.Duration;
import java.time.LocalDateTime;
import java.util.Arrays;
import java.util.List;
import java.util.concurrent.CompletableFuture;
import java.util.concurrent.TimeoutException;

@Slf4j
@Service
@RequiredArgsConstructor
public class MonitorCheckService {

    private final MonitorCheckRepository monitorCheckRepository;
    private final MonitorRepository monitorRepository;
    private final WebSocketNotificationService webSocketService;
    private final NotificationService notificationService;
    private final WebClient.Builder webClientBuilder;

    @Value("${inferno.uptime.user-agent:InfernoUptime/1.0}")
    private String userAgent;

    @Value("${inferno.uptime.retry-attempts:3}")
    private int retryAttempts;

    @Async
    public CompletableFuture<MonitorCheck> performCheck(Monitor monitor) {
        log.debug("Performing check for monitor: {} ({})", monitor.getName(), monitor.getUrl());

        long startTime = System.currentTimeMillis();
        MonitorCheck check = new MonitorCheck();
        check.setMonitor(monitor);
        check.setTimestamp(LocalDateTime.now());

        try {
            switch (monitor.getType()) {
                case HTTP, HTTPS -> performHttpCheck(monitor, check, startTime);
                case TCP -> performTcpCheck(monitor, check, startTime);
                case PING -> performPingCheck(monitor, check, startTime);
                case DNS -> performDnsCheck(monitor, check, startTime);
                default -> throw new UnsupportedOperationException("Monitor type not supported: " + monitor.getType());
            }
        } catch (Exception e) {
            log.error("Error performing check for monitor {}: {}", monitor.getName(), e.getMessage());
            handleCheckError(check, e, startTime);
        }

        // Save check result
        check = saveCheckResult(check);

        // Update monitor status
        updateMonitorStatus(monitor, check);

        // Send notifications if status changed
        notifyStatusChange(monitor, check);

        log.debug("Completed check for monitor: {} - Status: {}, Response time: {}ms",
                monitor.getName(), check.getIsUp() ? "UP" : "DOWN", check.getResponseTime());

        return CompletableFuture.completedFuture(check);
    }

    private void performHttpCheck(Monitor monitor, MonitorCheck check, long startTime) {
        WebClient webClient = webClientBuilder
                .codecs(configurer -> configurer.defaultCodecs().maxInMemorySize(1024 * 1024)) // 1MB limit
                .build();

        try {
            String response = webClient.get()
                    .uri(monitor.getUrl())
                    .header("User-Agent", userAgent)
                    .retrieve()
                    .bodyToMono(String.class)
                    .timeout(Duration.ofSeconds(monitor.getTimeoutSeconds()))
                    .retryWhen(Retry.fixedDelay(retryAttempts, Duration.ofMillis(500)))
                    .doOnError(WebClientResponseException.class, ex -> {
                        check.setStatusCode(ex.getStatusCode().value());
                        check.setErrorDetails(ex.getMessage());
                    })
                    .block();

            long responseTime = System.currentTimeMillis() - startTime;
            check.setResponseTime(responseTime);
            check.setStatusCode(200); // Success case
            check.setIsUp(true);
            check.setMessage("HTTP check successful");
            check.setContentLength(response != null ? (long) response.length() : 0L);

            // Keyword check
            if (monitor.getKeywordCheck() != null && !monitor.getKeywordCheck().trim().isEmpty()) {
                if (response == null || !response.contains(monitor.getKeywordCheck())) {
                    check.setIsUp(false);
                    check.setMessage("Keyword not found: " + monitor.getKeywordCheck());
                }
            }

        } catch (WebClientResponseException e) {
            long responseTime = System.currentTimeMillis() - startTime;
            check.setResponseTime(responseTime);
            check.setStatusCode(e.getStatusCode().value());
            check.setIsUp(isSuccessStatusCode(e.getStatusCode().value(), monitor.getExpectedStatusCodes()));
            check.setMessage("HTTP " + e.getStatusCode().value());
            check.setErrorDetails(e.getMessage());
        }
    }

    private void performTcpCheck(Monitor monitor, MonitorCheck check, long startTime) {
        try {
            URI uri = URI.create(monitor.getUrl());
            String host = uri.getHost();
            int port = uri.getPort() != -1 ? uri.getPort() : 80;

            try (java.net.Socket socket = new java.net.Socket()) {
                socket.connect(new java.net.InetSocketAddress(host, port), monitor.getTimeoutSeconds() * 1000);

                long responseTime = System.currentTimeMillis() - startTime;
                check.setResponseTime(responseTime);
                check.setIsUp(true);
                check.setMessage("TCP connection successful");
            }
        } catch (Exception e) {
            long responseTime = System.currentTimeMillis() - startTime;
            check.setResponseTime(responseTime);
            check.setIsUp(false);
            check.setMessage("TCP connection failed");
            check.setErrorDetails(e.getMessage());
        }
    }

    private void performPingCheck(Monitor monitor, MonitorCheck check, long startTime) {
        try {
            URI uri = URI.create(monitor.getUrl());
            String host = uri.getHost();

            boolean reachable = java.net.InetAddress.getByName(host)
                    .isReachable(monitor.getTimeoutSeconds() * 1000);

            long responseTime = System.currentTimeMillis() - startTime;
            check.setResponseTime(responseTime);
            check.setIsUp(reachable);
            check.setMessage(reachable ? "Host is reachable" : "Host is not reachable");

        } catch (Exception e) {
            long responseTime = System.currentTimeMillis() - startTime;
            check.setResponseTime(responseTime);
            check.setIsUp(false);
            check.setMessage("Ping failed");
            check.setErrorDetails(e.getMessage());
        }
    }

    private void performDnsCheck(Monitor monitor, MonitorCheck check, long startTime) {
        try {
            URI uri = URI.create(monitor.getUrl());
            String host = uri.getHost();

            java.net.InetAddress address = java.net.InetAddress.getByName(host);

            long responseTime = System.currentTimeMillis() - startTime;
            check.setResponseTime(responseTime);
            check.setIsUp(true);
            check.setMessage("DNS resolution successful: " + address.getHostAddress());

        } catch (Exception e) {
            long responseTime = System.currentTimeMillis() - startTime;
            check.setResponseTime(responseTime);
            check.setIsUp(false);
            check.setMessage("DNS resolution failed");
            check.setErrorDetails(e.getMessage());
        }
    }

    private void handleCheckError(MonitorCheck check, Exception e, long startTime) {
        long responseTime = System.currentTimeMillis() - startTime;
        check.setResponseTime(responseTime);
        check.setIsUp(false);
        check.setMessage("Check failed: " + e.getMessage());
        check.setErrorDetails(e.getClass().getSimpleName() + ": " + e.getMessage());

        if (e instanceof TimeoutException) {
            check.setMessage("Request timeout");
        }
    }

    private boolean isSuccessStatusCode(int statusCode, String expectedCodes) {
        if (expectedCodes == null || expectedCodes.trim().isEmpty()) {
            return statusCode >= 200 && statusCode < 300;
        }

        return Arrays.stream(expectedCodes.split(","))
                .map(String::trim)
                .mapToInt(Integer::parseInt)
                .anyMatch(code -> code == statusCode);
    }

    @Transactional
    private MonitorCheck saveCheckResult(MonitorCheck check) {
        return monitorCheckRepository.save(check);
    }

    @Transactional
    private void updateMonitorStatus(Monitor monitor, MonitorCheck check) {
        Monitor.MonitorStatus newStatus = check.getIsUp() ?
                Monitor.MonitorStatus.UP : Monitor.MonitorStatus.DOWN;

        if (monitor.getCurrentStatus() != newStatus) {
            monitor.setCurrentStatus(newStatus);
            monitor.setLastChecked(check.getTimestamp());
            monitorRepository.save(monitor);
        }
    }

    private void notifyStatusChange(Monitor monitor, MonitorCheck check) {
        // Send real-time WebSocket notification
        webSocketService.sendMonitorUpdate(monitor, check);

        // Send email/webhook notifications if status changed
        if (shouldSendNotification(monitor, check)) {
            notificationService.sendStatusChangeNotification(monitor, check);
        }
    }

    private boolean shouldSendNotification(Monitor monitor, MonitorCheck check) {
        // Get the previous check to see if status actually changed
        List<MonitorCheck> recentChecks = monitorCheckRepository.findRecentChecksByMonitorId(
                monitor.getId(), 2);

        if (recentChecks.size() < 2) {
            return true; // First check
        }

        MonitorCheck previousCheck = recentChecks.get(1);
        return !check.getIsUp().equals(previousCheck.getIsUp());
    }
}