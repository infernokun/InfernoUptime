package com.infernokun.infernoUptime.models.entity;

import com.fasterxml.jackson.annotation.JsonIgnore;
import jakarta.persistence.*;
import lombok.Getter;
import lombok.Setter;

import java.time.LocalDateTime;

@Entity
@Getter
@Setter
@Table(name = "monitor_checks")
public class MonitorCheck {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "monitor_id", nullable = false)
    @JsonIgnore
    private Monitor monitor;

    @Column(nullable = false)
    private LocalDateTime timestamp;

    @Column(name = "response_time")
    private Long responseTime; // milliseconds

    @Column(name = "status_code")
    private Integer statusCode;

    @Column(name = "is_up")
    private Boolean isUp;

    @Column(columnDefinition = "TEXT")
    private String message;

    @Column(name = "error_details", columnDefinition = "TEXT")
    private String errorDetails;

    @Column(name = "ssl_expiry")
    private LocalDateTime sslExpiry;

    @Column(name = "redirect_count")
    private Integer redirectCount;

    @Column(name = "content_length")
    private Long contentLength;

    @PrePersist
    protected void onCreate() {
        if (timestamp == null) {
            timestamp = LocalDateTime.now();
        }
    }

    // Constructors
    public MonitorCheck() {}

    public MonitorCheck(Monitor monitor, Boolean isUp, Long responseTime) {
        this.monitor = monitor;
        this.isUp = isUp;
        this.responseTime = responseTime;
        this.timestamp = LocalDateTime.now();
    }
}