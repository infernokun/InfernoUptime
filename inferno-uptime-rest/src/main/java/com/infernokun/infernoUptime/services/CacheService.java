package com.infernokun.infernoUptime.services;

import com.infernokun.infernoUptime.models.entity.Monitor;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.cache.annotation.CacheEvict;
import org.springframework.cache.annotation.CachePut;
import org.springframework.cache.annotation.Cacheable;
import org.springframework.data.redis.core.RedisTemplate;
import org.springframework.stereotype.Service;

import java.time.Duration;
import java.util.List;
import java.util.concurrent.TimeUnit;

@Slf4j
@Service
@RequiredArgsConstructor
public class CacheService {

    private final RedisTemplate<String, Object> redisTemplate;

    private static final String MONITOR_CACHE_PREFIX = "monitor:";
    private static final String ACTIVE_MONITORS_KEY = "monitors:active";
    private static final String MONITOR_STATS_PREFIX = "stats:";
    private static final Duration CACHE_TTL = Duration.ofMinutes(10);

    @Cacheable(value = "monitors", key = "#id")
    public Monitor getMonitor(Long id) {
        // This method is used by the cache abstraction
        // The actual data fetching is handled by the calling service
        return null;
    }

    @CachePut(value = "monitors", key = "#monitor.id")
    public Monitor cacheMonitor(Monitor monitor) {
        log.debug("Caching monitor: {}", monitor.getId());

        // Also cache in Redis with TTL
        String key = MONITOR_CACHE_PREFIX + monitor.getId();
        redisTemplate.opsForValue().set(key, monitor, CACHE_TTL.toMinutes(), TimeUnit.MINUTES);

        return monitor;
    }

    @CacheEvict(value = "monitors", key = "#id")
    public void evictMonitor(Long id) {
        log.debug("Evicting monitor from cache: {}", id);

        String key = MONITOR_CACHE_PREFIX + id;
        redisTemplate.delete(key);
    }

    @Cacheable(value = "activeMonitors", key = "'all'")
    public List<Monitor> getActiveMonitors() {
        log.debug("Retrieving active monitors from cache");

        @SuppressWarnings("unchecked")
        List<Monitor> monitors = (List<Monitor>) redisTemplate.opsForValue().get(ACTIVE_MONITORS_KEY);
        return monitors != null ? monitors : List.of();
    }

    public void cacheActiveMonitors(List<Monitor> monitors) {
        log.debug("Caching {} active monitors", monitors.size());

        redisTemplate.opsForValue().set(ACTIVE_MONITORS_KEY, monitors,
                CACHE_TTL.toMinutes(), TimeUnit.MINUTES);
    }

    @CacheEvict(value = "activeMonitors", key = "'all'")
    public void evictActiveMonitors() {
        log.debug("Evicting active monitors from cache");
        redisTemplate.delete(ACTIVE_MONITORS_KEY);
    }

    // Monitor statistics caching
    public void cacheMonitorStats(Long monitorId, Object stats) {
        String key = MONITOR_STATS_PREFIX + monitorId;
        redisTemplate.opsForValue().set(key, stats, 5, TimeUnit.MINUTES);
    }

    public Object getMonitorStats(Long monitorId) {
        String key = MONITOR_STATS_PREFIX + monitorId;
        return redisTemplate.opsForValue().get(key);
    }

    public void evictMonitorStats(Long monitorId) {
        String key = MONITOR_STATS_PREFIX + monitorId;
        redisTemplate.delete(key);
    }

    // Dashboard summary caching
    public void cacheDashboardSummary(Object summary) {
        redisTemplate.opsForValue().set("dashboard:summary", summary, 2, TimeUnit.MINUTES);
    }

    public Object getDashboardSummary() {
        return redisTemplate.opsForValue().get("dashboard:summary");
    }

    // Check results caching (recent checks)
    public void cacheRecentChecks(Long monitorId, Object checks) {
        String key = "checks:recent:" + monitorId;
        redisTemplate.opsForValue().set(key, checks, 1, TimeUnit.MINUTES);
    }

    public Object getRecentChecks(Long monitorId) {
        String key = "checks:recent:" + monitorId;
        return redisTemplate.opsForValue().get(key);
    }

    // Utility methods
    public boolean existsInCache(String key) {
        return Boolean.TRUE.equals(redisTemplate.hasKey(key));
    }

    public void evictAllCaches() {
        log.info("Evicting all caches");

        // Clear specific cache keys
        redisTemplate.delete(ACTIVE_MONITORS_KEY);
        redisTemplate.delete("dashboard:summary");

        // Clear pattern-based keys
        clearPattern(MONITOR_CACHE_PREFIX + "*");
        clearPattern(MONITOR_STATS_PREFIX + "*");
        clearPattern("checks:recent:*");
    }

    private void clearPattern(String pattern) {
        try {
            redisTemplate.delete(redisTemplate.keys(pattern));
        } catch (Exception e) {
            log.warn("Failed to clear cache pattern {}: {}", pattern, e.getMessage());
        }
    }

    // Health check for cache
    public boolean isHealthy() {
        try {
            redisTemplate.opsForValue().set("health:check", "ok", 1, TimeUnit.SECONDS);
            String result = (String) redisTemplate.opsForValue().get("health:check");
            return "ok".equals(result);
        } catch (Exception e) {
            log.error("Cache health check failed", e);
            return false;
        }
    }
}