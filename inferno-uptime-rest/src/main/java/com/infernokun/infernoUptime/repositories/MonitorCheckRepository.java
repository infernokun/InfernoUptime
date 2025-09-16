package com.infernokun.infernoUptime.repositories;

import com.infernokun.infernoUptime.models.entity.Monitor;
import com.infernokun.infernoUptime.models.entity.MonitorCheck;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;

@Repository
public interface MonitorCheckRepository extends JpaRepository<MonitorCheck, Long> {

    // ======================== Basic Finder Methods ========================

    Page<MonitorCheck> findByMonitorOrderByTimestampDesc(Monitor monitor, Pageable pageable);

    List<MonitorCheck> findByMonitorAndTimestampAfterOrderByTimestampDesc(
            Monitor monitor, LocalDateTime after);

    @Query("SELECT mc FROM MonitorCheck mc WHERE mc.monitor = :monitor ORDER BY mc.timestamp DESC LIMIT 1")
    Optional<MonitorCheck> findLatestCheckByMonitor(@Param("monitor") Monitor monitor);

    @Query("SELECT mc FROM MonitorCheck mc WHERE mc.monitor = :monitor " +
            "AND mc.timestamp >= :startTime AND mc.timestamp <= :endTime " +
            "ORDER BY mc.timestamp ASC")
    List<MonitorCheck> findByMonitorAndTimestampBetween(
            @Param("monitor") Monitor monitor,
            @Param("startTime") LocalDateTime startTime,
            @Param("endTime") LocalDateTime endTime);

    @Query("SELECT mc FROM MonitorCheck mc WHERE mc.monitor.id = :monitorId " +
            "ORDER BY mc.timestamp DESC LIMIT :limit")
    List<MonitorCheck> findRecentChecksByMonitorId(@Param("monitorId") Long monitorId, @Param("limit") int limit);

    // ======================== Statistics Methods ========================

    @Query("SELECT AVG(mc.responseTime) FROM MonitorCheck mc WHERE mc.monitor = :monitor " +
            "AND mc.isUp = true AND mc.timestamp >= :since")
    Double findAverageResponseTime(@Param("monitor") Monitor monitor, @Param("since") LocalDateTime since);

    @Query("SELECT COUNT(mc) FROM MonitorCheck mc WHERE mc.monitor = :monitor " +
            "AND mc.isUp = true AND mc.timestamp >= :since")
    Long countSuccessfulChecks(@Param("monitor") Monitor monitor, @Param("since") LocalDateTime since);

    @Query("SELECT COUNT(mc) FROM MonitorCheck mc WHERE mc.monitor = :monitor " +
            "AND mc.timestamp >= :since")
    Long countTotalChecks(@Param("monitor") Monitor monitor, @Param("since") LocalDateTime since);

    // ======================== Time-based Count Methods ========================

    @Query("SELECT COUNT(mc) FROM MonitorCheck mc WHERE mc.timestamp >= :since")
    Long countChecksAfter(@Param("since") LocalDateTime since);

    // FIXED: Use parameter instead of database-specific functions
    @Query("SELECT COUNT(mc) FROM MonitorCheck mc WHERE mc.timestamp >= :startOfDay AND mc.timestamp < :endOfDay")
    Long countTodaysChecks(@Param("startOfDay") LocalDateTime startOfDay, @Param("endOfDay") LocalDateTime endOfDay);

    @Query("SELECT COUNT(mc) FROM MonitorCheck mc WHERE mc.timestamp >= :startOfWeek")
    Long countChecksThisWeek(@Param("startOfWeek") LocalDateTime startOfWeek);

    @Query("SELECT COUNT(mc) FROM MonitorCheck mc WHERE mc.timestamp >= :startOfMonth")
    Long countChecksThisMonth(@Param("startOfMonth") LocalDateTime startOfMonth);

    // ======================== Failure Analysis Methods ========================

    @Query("SELECT mc FROM MonitorCheck mc WHERE mc.isUp = false " +
            "AND mc.timestamp >= :since ORDER BY mc.timestamp DESC")
    List<MonitorCheck> findRecentFailures(@Param("since") LocalDateTime since);

    @Query("SELECT DISTINCT mc.monitor FROM MonitorCheck mc WHERE mc.isUp = false " +
            "AND mc.timestamp >= :since")
    List<Monitor> findMonitorsWithRecentFailures(@Param("since") LocalDateTime since);

    @Query("SELECT COUNT(mc) FROM MonitorCheck mc WHERE mc.isUp = false " +
            "AND mc.timestamp >= :since")
    Long countFailedChecks(@Param("since") LocalDateTime since);

    // ======================== Performance Analysis ========================

    @Query("SELECT mc FROM MonitorCheck mc WHERE mc.responseTime > :threshold " +
            "AND mc.timestamp >= :since ORDER BY mc.responseTime DESC")
    List<MonitorCheck> findSlowChecks(@Param("threshold") Long threshold, @Param("since") LocalDateTime since);

    @Query("SELECT AVG(mc.responseTime) FROM MonitorCheck mc WHERE mc.isUp = true " +
            "AND mc.timestamp >= :since")
    Double findOverallAverageResponseTime(@Param("since") LocalDateTime since);

    @Query("SELECT MAX(mc.responseTime) FROM MonitorCheck mc WHERE mc.timestamp >= :since")
    Long findMaxResponseTime(@Param("since") LocalDateTime since);

    @Query("SELECT MIN(mc.responseTime) FROM MonitorCheck mc WHERE mc.isUp = true " +
            "AND mc.timestamp >= :since")
    Long findMinResponseTime(@Param("since") LocalDateTime since);

    // ======================== Uptime Calculation Methods ========================

    @Query("""
        SELECT 
            COUNT(CASE WHEN mc.isUp = true THEN 1 END) * 100.0 / COUNT(*) 
        FROM MonitorCheck mc 
        WHERE mc.monitor = :monitor 
        AND mc.timestamp >= :since
        """)
    Double calculateUptimePercentage(@Param("monitor") Monitor monitor, @Param("since") LocalDateTime since);

    @Query("""
        SELECT 
            COUNT(CASE WHEN mc.isUp = true THEN 1 END) * 100.0 / COUNT(*) 
        FROM MonitorCheck mc 
        WHERE mc.timestamp >= :since
        """)
    Double calculateOverallUptimePercentage(@Param("since") LocalDateTime since);

    // ======================== Data Cleanup Methods ========================

    @Modifying
    @Query("DELETE FROM MonitorCheck mc WHERE mc.timestamp < :cutoffDate")
    void deleteOldChecks(@Param("cutoffDate") LocalDateTime cutoffDate);

    @Modifying
    @Query("DELETE FROM MonitorCheck mc WHERE mc.monitor = :monitor")
    void deleteAllChecksByMonitor(@Param("monitor") Monitor monitor);

    @Query("SELECT COUNT(mc) FROM MonitorCheck mc WHERE mc.timestamp < :cutoffDate")
    Long countOldChecks(@Param("cutoffDate") LocalDateTime cutoffDate);

    // ======================== Dashboard Queries (SIMPLIFIED) ========================

    // SIMPLIFIED: Removed database-specific DATE() functions
    @Query("""
        SELECT mc.timestamp, 
               COUNT(CASE WHEN mc.isUp = true THEN 1 END) * 100.0 / COUNT(*) as uptime
        FROM MonitorCheck mc 
        WHERE mc.timestamp >= :since 
        GROUP BY mc.timestamp 
        ORDER BY mc.timestamp DESC
        """)
    List<Object[]> getDailyUptimeStats(@Param("since") LocalDateTime since);

    @Query("""
        SELECT mc.monitor.name, 
               COUNT(CASE WHEN mc.isUp = true THEN 1 END) * 100.0 / COUNT(*) as uptime,
               AVG(mc.responseTime) as avgResponseTime
        FROM MonitorCheck mc 
        WHERE mc.timestamp >= :since 
        GROUP BY mc.monitor.id, mc.monitor.name
        ORDER BY uptime DESC
        """)
    List<Object[]> getMonitorPerformanceSummary(@Param("since") LocalDateTime since);

    // SIMPLIFIED: Removed HOUR() function
    @Query("""
        SELECT mc.timestamp, 
               AVG(mc.responseTime) as avgResponseTime,
               COUNT(CASE WHEN mc.isUp = true THEN 1 END) * 100.0 / COUNT(*) as uptime
        FROM MonitorCheck mc 
        WHERE mc.timestamp >= :since 
        GROUP BY mc.timestamp
        ORDER BY mc.timestamp
        """)
    List<Object[]> getHourlyPerformanceStats(@Param("since") LocalDateTime since);

    @Query("""
        SELECT mc.timestamp, mc.responseTime, mc.isUp 
        FROM MonitorCheck mc 
        WHERE mc.monitor = :monitor 
        AND mc.timestamp >= :since 
        ORDER BY mc.timestamp ASC
        """)
    List<Object[]> getTimeSeriesData(@Param("monitor") Monitor monitor, @Param("since") LocalDateTime since);

    // ======================== Health Check Methods ========================

    @Query("SELECT COUNT(mc) FROM MonitorCheck mc WHERE mc.timestamp >= :recentTime")
    Long countRecentChecks(@Param("recentTime") LocalDateTime recentTime);

    @Query("""
        SELECT mc.monitor.id, MAX(mc.timestamp) as lastCheck 
        FROM MonitorCheck mc 
        GROUP BY mc.monitor.id 
        HAVING MAX(mc.timestamp) < :threshold
        """)
    List<Object[]> findMonitorsWithStaleChecks(@Param("threshold") LocalDateTime threshold);
}