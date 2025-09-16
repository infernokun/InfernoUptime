package com.infernokun.infernoUptime.repositories;

import com.infernokun.infernoUptime.models.entity.Monitor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;
import java.util.List;

@Repository
public interface MonitorRepository extends JpaRepository<Monitor, Long> {

    // ======================== Basic Finder Methods ========================

    List<Monitor> findByIsActiveTrue();

    List<Monitor> findByIsActiveTrueOrderByNameAsc();

    Page<Monitor> findByIsActiveTrueOrderByNameAsc(Pageable pageable);

    List<Monitor> findByCurrentStatus(Monitor.MonitorStatus status);

    List<Monitor> findByCurrentStatusAndIsActiveTrue(Monitor.MonitorStatus status);

    Page<Monitor> findByCurrentStatusAndIsActiveTrue(Monitor.MonitorStatus status, Pageable pageable);

    List<Monitor> findByTypeAndIsActiveTrue(Monitor.MonitorType type);

    // ======================== Search Methods ========================

    @Query("SELECT m FROM Monitor m WHERE m.name LIKE %:name% AND m.isActive = true")
    List<Monitor> findActiveMonitorsByNameContaining(@Param("name") String name);

    @Query("SELECT m FROM Monitor m WHERE m.name LIKE %:name% AND m.isActive = true")
    Page<Monitor> findActiveMonitorsByNameContaining(@Param("name") String name, Pageable pageable);

    // ======================== Count Methods ========================

    @Query("SELECT COUNT(m) FROM Monitor m WHERE m.isActive = true")
    Long countByIsActiveTrue();

    @Query("SELECT COUNT(m) FROM Monitor m WHERE m.currentStatus = :status AND m.isActive = true")
    Long countByStatus(@Param("status") Monitor.MonitorStatus status);

    @Query("SELECT COUNT(m) FROM Monitor m WHERE m.currentStatus = :status")
    Long countByCurrentStatus(@Param("status") Monitor.MonitorStatus status);

    // ======================== Dashboard Queries ========================

    @Query("SELECT m FROM Monitor m WHERE m.isActive = true ORDER BY m.name ASC")
    List<Monitor> findActiveMonitorsOrderByName();

    @Query("SELECT m FROM Monitor m WHERE m.currentStatus = 'DOWN' AND m.isActive = true ORDER BY m.lastChecked DESC")
    List<Monitor> findRecentlyDownMonitors(Pageable pageable);

    @Query(value = """
        SELECT m.* FROM monitors m 
        LEFT JOIN (
            SELECT monitor_id, AVG(response_time) as avg_response 
            FROM monitor_checks 
            WHERE timestamp >= NOW() - INTERVAL '24 HOURS' 
            AND is_up = true 
            GROUP BY monitor_id
        ) avg_times ON m.id = avg_times.monitor_id 
        WHERE m.is_active = true 
        ORDER BY avg_times.avg_response DESC NULLS LAST 
        LIMIT :limit
        """, nativeQuery = true)
    List<Monitor> findSlowestMonitors(@Param("limit") int limit);

    @Query(value = """
        SELECT m.* FROM monitors m 
        LEFT JOIN (
            SELECT monitor_id, AVG(response_time) as avg_response 
            FROM monitor_checks 
            WHERE timestamp >= NOW() - INTERVAL '24 HOURS' 
            AND is_up = true 
            GROUP BY monitor_id
        ) avg_times ON m.id = avg_times.monitor_id 
        WHERE m.is_active = true AND avg_times.avg_response IS NOT NULL
        ORDER BY avg_times.avg_response ASC 
        LIMIT :limit
        """, nativeQuery = true)
    List<Monitor> findFastestMonitors(@Param("limit") int limit);

    // ======================== Advanced Search ========================

    @Query("SELECT m FROM Monitor m WHERE m.url = :url AND m.isActive = true")
    List<Monitor> findActiveMonitorsByUrl(@Param("url") String url);

    @Query("""
        SELECT m FROM Monitor m 
        WHERE m.isActive = true 
        AND (:search IS NULL OR :search = '' OR 
             LOWER(m.name) LIKE LOWER(CONCAT('%', :search, '%')) OR 
             LOWER(m.url) LIKE LOWER(CONCAT('%', :search, '%')))
        AND (:status IS NULL OR m.currentStatus = :status)
        ORDER BY m.name ASC
        """)
    Page<Monitor> findMonitorsWithFilters(@Param("search") String search,
                                          @Param("status") Monitor.MonitorStatus status,
                                          Pageable pageable);

    @Query("""
        SELECT m FROM Monitor m 
        WHERE m.isActive = true 
        AND (:name IS NULL OR :name = '' OR LOWER(m.name) LIKE LOWER(CONCAT('%', :name, '%')))
        AND (:url IS NULL OR :url = '' OR LOWER(m.url) LIKE LOWER(CONCAT('%', :url, '%')))
        AND (:type IS NULL OR m.type = :type)
        AND (:status IS NULL OR m.currentStatus = :status)
        ORDER BY m.name ASC
        """)
    Page<Monitor> findMonitorsWithAdvancedFilters(@Param("name") String name,
                                                  @Param("url") String url,
                                                  @Param("type") Monitor.MonitorType type,
                                                  @Param("status") Monitor.MonitorStatus status,
                                                  Pageable pageable);

    // ======================== Maintenance Queries ========================

    @Query("SELECT m FROM Monitor m WHERE m.lastChecked < :cutoffTime AND m.isActive = true")
    List<Monitor> findMonitorsNotCheckedSince(@Param("cutoffTime") java.time.LocalDateTime cutoffTime);

    @Query("SELECT m FROM Monitor m WHERE m.currentStatus = 'PENDING' AND m.isActive = true")
    List<Monitor> findPendingMonitors();

    @Query("""
        SELECT DISTINCT m FROM Monitor m 
        LEFT JOIN m.checks c 
        WHERE m.isActive = true 
        AND (c IS NULL OR c.timestamp < :since)
        """)
    List<Monitor> findMonitorsWithoutRecentChecks(@Param("since") java.time.LocalDateTime since);
}