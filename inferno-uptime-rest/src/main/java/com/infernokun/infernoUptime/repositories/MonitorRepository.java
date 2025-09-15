package com.infernokun.infernoUptime.repositories;

import com.infernokun.infernoUptime.models.entity.Monitor;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;
import java.util.List;

@Repository
public interface MonitorRepository extends JpaRepository<Monitor, Long> {

    List<Monitor> findByIsActiveTrue();

    List<Monitor> findByCurrentStatus(Monitor.MonitorStatus status);

    List<Monitor> findByTypeAndIsActiveTrue(Monitor.MonitorType type);

    List<Monitor> findByIsActiveTrueOrderByNameAsc();

    @Query("SELECT m FROM Monitor m WHERE m.isActive = true ORDER BY m.name ASC")
    List<Monitor> findActiveMonitorsOrderByName();

    @Query("SELECT COUNT(m) FROM Monitor m WHERE m.currentStatus = :status")
    Long countByStatus(@Param("status") Monitor.MonitorStatus status);

    @Query("SELECT m FROM Monitor m WHERE m.name LIKE %:name% AND m.isActive = true")
    List<Monitor> findActiveMonitorsByNameContaining(@Param("name") String name);
}