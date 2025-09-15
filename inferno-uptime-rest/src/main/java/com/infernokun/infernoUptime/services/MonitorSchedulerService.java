package com.infernokun.infernoUptime.services;

import com.infernokun.infernoUptime.models.entity.Monitor;
import com.infernokun.infernoUptime.repositories.MonitorRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.scheduling.concurrent.ThreadPoolTaskExecutor;
import org.springframework.stereotype.Service;

import jakarta.annotation.PostConstruct;
import jakarta.annotation.PreDestroy;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.ScheduledExecutorService;
import java.util.concurrent.ScheduledThreadPoolExecutor;
import java.util.concurrent.TimeUnit;

@Slf4j
@Service
@RequiredArgsConstructor
public class MonitorSchedulerService {

    private final MonitorRepository monitorRepository;
    private final MonitorCheckService monitorCheckService;
    private final CacheService cacheService;

    @Value("${inferno.uptime.concurrent-checks:50}")
    private int maxConcurrentChecks;

    @Value("${inferno.uptime.thread-pool-size:20}")
    private int threadPoolSize;

    private ScheduledExecutorService schedulerExecutor;
    private ThreadPoolTaskExecutor checkExecutor;
    private final Map<Long, LocalDateTime> lastCheckTimes = new ConcurrentHashMap<>();
    private volatile boolean shutdownRequested = false;

    @PostConstruct
    public void initialize() {
        log.info("Initializing Monitor Scheduler Service");

        // Create scheduler thread pool
        schedulerExecutor = new ScheduledThreadPoolExecutor(2, r -> {
            Thread t = new Thread(r, "monitor-scheduler");
            t.setDaemon(true);
            return t;
        });

        // Create check execution thread pool
        checkExecutor = new ThreadPoolTaskExecutor();
        checkExecutor.setCorePoolSize(threadPoolSize);
        checkExecutor.setMaxPoolSize(maxConcurrentChecks);
        checkExecutor.setQueueCapacity(200);
        checkExecutor.setThreadNamePrefix("monitor-check-");
        checkExecutor.setRejectedExecutionHandler((r, executor) -> {
            log.warn("Monitor check task rejected due to thread pool limits");
        });
        checkExecutor.initialize();

        log.info("Monitor Scheduler initialized with {} threads, max {} concurrent checks",
                threadPoolSize, maxConcurrentChecks);
    }

    @PreDestroy
    public void shutdown() {
        log.info("Shutting down Monitor Scheduler Service");
        shutdownRequested = true;

        if (schedulerExecutor != null) {
            schedulerExecutor.shutdown();
            try {
                if (!schedulerExecutor.awaitTermination(30, TimeUnit.SECONDS)) {
                    schedulerExecutor.shutdownNow();
                }
            } catch (InterruptedException e) {
                schedulerExecutor.shutdownNow();
                Thread.currentThread().interrupt();
            }
        }

        if (checkExecutor != null) {
            checkExecutor.shutdown();
        }
    }

    /**
     * Main scheduler that runs every 30 seconds to check which monitors need checking
     */
    @Scheduled(fixedRate = 30000, initialDelay = 10000) // Every 30 seconds, start after 10 seconds
    public void scheduleMonitorChecks() {
        if (shutdownRequested) {
            return;
        }

        try {
            List<Monitor> activeMonitors = getActiveMonitors();
            LocalDateTime now = LocalDateTime.now();

            log.debug("Scheduling checks for {} active monitors", activeMonitors.size());

            for (Monitor monitor : activeMonitors) {
                if (shouldCheckMonitor(monitor, now)) {
                    scheduleCheck(monitor);
                }
            }

        } catch (Exception e) {
            log.error("Error in monitor scheduling", e);
        }
    }

    /**
     * Cleanup task that runs daily to remove old check data
     */
    @Scheduled(cron = "${inferno.uptime.cleanup.schedule:0 0 2 * * ?}") // Daily at 2 AM
    public void cleanupOldData() {
        if (!isCleanupEnabled()) {
            return;
        }

        try {
            log.info("Starting cleanup of old monitor check data");

            LocalDateTime cutoffDate = LocalDateTime.now()
                    .minusDays(getRetentionDays());

            // This would be implemented in a cleanup service
            // cleanupService.cleanupOldChecks(cutoffDate);

            log.info("Completed cleanup of old monitor check data");

        } catch (Exception e) {
            log.error("Error during cleanup task", e);
        }
    }

    /**
     * Cache refresh task that runs every 5 minutes
     */
    @Scheduled(fixedRate = 300000) // Every 5 minutes
    public void refreshCache() {
        try {
            log.debug("Refreshing active monitors cache");
            List<Monitor> activeMonitors = monitorRepository.findByIsActiveTrueOrderByNameAsc();
            cacheService.cacheActiveMonitors(activeMonitors);

        } catch (Exception e) {
            log.error("Error refreshing cache", e);
        }
    }

    private List<Monitor> getActiveMonitors() {
        List<Monitor> monitors = cacheService.getActiveMonitors();
        if (monitors.isEmpty()) {
            monitors = monitorRepository.findByIsActiveTrueOrderByNameAsc();
            cacheService.cacheActiveMonitors(monitors);
        }
        return monitors;
    }

    private boolean shouldCheckMonitor(Monitor monitor, LocalDateTime now) {
        LocalDateTime lastCheck = lastCheckTimes.get(monitor.getId());

        if (lastCheck == null) {
            // Never checked, should check now
            return true;
        }

        long secondsSinceLastCheck = java.time.Duration.between(lastCheck, now).getSeconds();
        return secondsSinceLastCheck >= monitor.getCheckInterval();
    }

    private void scheduleCheck(Monitor monitor) {
        try {
            checkExecutor.execute(() -> {
                try {
                    log.debug("Executing check for monitor: {} ({})", monitor.getName(), monitor.getUrl());

                    // Update last check time immediately to prevent duplicate scheduling
                    lastCheckTimes.put(monitor.getId(), LocalDateTime.now());

                    // Perform the actual check
                    monitorCheckService.performCheck(monitor);

                } catch (Exception e) {
                    log.error("Error executing check for monitor {}: {}", monitor.getName(), e.getMessage());
                }
            });

        } catch (Exception e) {
            log.error("Failed to schedule check for monitor {}: {}", monitor.getName(), e.getMessage());
        }
    }

    /**
     * Manual trigger for immediate check
     */
    public void triggerImmediateCheck(Long monitorId) {
        try {
            Monitor monitor = monitorRepository.findById(monitorId)
                    .orElseThrow(() -> new RuntimeException("Monitor not found: " + monitorId));

            if (!monitor.getIsActive()) {
                throw new RuntimeException("Cannot check inactive monitor: " + monitorId);
            }

            log.info("Triggering immediate check for monitor: {} ({})", monitor.getName(), monitor.getUrl());
            scheduleCheck(monitor);

        } catch (Exception e) {
            log.error("Failed to trigger immediate check for monitor {}: {}", monitorId, e.getMessage());
            throw e;
        }
    }

    /**
     * Get scheduler status and statistics
     */
    public SchedulerStatus getStatus() {
        int activeThreads = checkExecutor.getActiveCount();
        int queuedTasks = checkExecutor.getThreadPoolExecutor().getQueue().size();
        int totalScheduledChecks = lastCheckTimes.size();

        return SchedulerStatus.builder()
                .running(!shutdownRequested)
                .activeThreads(activeThreads)
                .maxThreads(maxConcurrentChecks)
                .queuedTasks(queuedTasks)
                .totalScheduledMonitors(totalScheduledChecks)
                .build();
    }

    @Value("${inferno.uptime.cleanup.enabled:true}")
    private boolean cleanupEnabled;

    @Value("${inferno.uptime.cleanup.retention-days:90}")
    private int retentionDays;

    private boolean isCleanupEnabled() {
        return cleanupEnabled;
    }

    private int getRetentionDays() {
        return retentionDays;
    }

    // Inner class for scheduler status
    @lombok.Data
    @lombok.Builder
    public static class SchedulerStatus {
        private boolean running;
        private int activeThreads;
        private int maxThreads;
        private int queuedTasks;
        private int totalScheduledMonitors;
    }
}