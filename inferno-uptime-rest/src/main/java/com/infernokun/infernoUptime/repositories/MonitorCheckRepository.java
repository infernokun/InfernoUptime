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

    @Query("SELECT AVG(mc.responseTime) FROM MonitorCheck mc WHERE mc.monitor = :monitor " +
            "AND mc.isUp = true AND mc.timestamp >= :since")
    Double findAverageResponseTime(@Param("monitor") Monitor monitor, @Param("since") LocalDateTime since);

    @Query("SELECT COUNT(mc) FROM MonitorCheck mc WHERE mc.monitor = :monitor " +
            "AND mc.isUp = true AND mc.timestamp >= :since")
    Long countSuccessfulChecks(@Param("monitor") Monitor monitor, @Param("since") LocalDateTime since);

    @Query("SELECT COUNT(mc) FROM MonitorCheck mc WHERE mc.monitor = :monitor " +
            "AND mc.timestamp >= :since")
    Long countTotalChecks(@Param("monitor") Monitor monitor, @Param("since") LocalDateTime since);

    @Modifying
    @Query("DELETE FROM MonitorCheck mc WHERE mc.timestamp < :cutoffDate")
    void deleteOldChecks(@Param("cutoffDate") LocalDateTime cutoffDate);

    @Query("SELECT mc FROM MonitorCheck mc WHERE mc.monitor.id = :monitorId " +
            "ORDER BY mc.timestamp DESC LIMIT :limit")
    List<MonitorCheck> findRecentChecksByMonitorId(@Param("monitorId") Long monitorId, @Param("limit") int limit);
}