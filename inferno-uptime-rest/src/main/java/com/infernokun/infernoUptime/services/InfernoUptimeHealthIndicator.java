package com.infernokun.infernoUptime.services;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.boot.actuate.health.Health;
import org.springframework.boot.actuate.health.HealthIndicator;
import org.springframework.stereotype.Component;

@Slf4j
@Component
@RequiredArgsConstructor
public class InfernoUptimeHealthIndicator implements HealthIndicator {

    private final CacheService cacheService;
    private final MonitorSchedulerService schedulerService;

    @Override
    public Health health() {
        try {
            Health.Builder builder = Health.up();

            // Check Redis cache
            boolean cacheHealthy = cacheService.isHealthy();
            builder.withDetail("cache", cacheHealthy ? "UP" : "DOWN");

            // Check scheduler
            MonitorSchedulerService.SchedulerStatus schedulerStatus = schedulerService.getStatus();
            builder.withDetail("scheduler", schedulerStatus.isRunning() ? "UP" : "DOWN");
            builder.withDetail("active_threads", schedulerStatus.getActiveThreads());
            builder.withDetail("queued_tasks", schedulerStatus.getQueuedTasks());

            // Overall health
            if (!cacheHealthy || !schedulerStatus.isRunning()) {
                builder.down();
            }

            return builder.build();

        } catch (Exception e) {
            log.error("Health check failed", e);
            return Health.down()
                    .withDetail("error", e.getMessage())
                    .build();
        }
    }
}