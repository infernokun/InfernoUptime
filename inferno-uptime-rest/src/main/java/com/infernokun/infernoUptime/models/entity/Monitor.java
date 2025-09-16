package com.infernokun.infernoUptime.models.entity;

import com.fasterxml.jackson.annotation.JsonIgnore;
import jakarta.persistence.*;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Min;
import lombok.*;

import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;

@Entity
@Getter
@Setter
@Builder
@Table(name = "monitors")
@AllArgsConstructor
public class Monitor {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @NotBlank(message = "Monitor name is required")
    @Column(nullable = false)
    private String name;

    @NotBlank(message = "URL is required")
    @Column(nullable = false)
    private String url;

    @Enumerated(EnumType.STRING)
    @NotNull(message = "Monitor type is required")
    private MonitorType type;

    @Min(value = 10, message = "Check interval must be at least 10 seconds")
    @Column(name = "check_interval")
    @Builder.Default
    private Integer checkInterval = 30; // seconds

    @Column(name = "is_active")
    @Builder.Default
    private Boolean isActive = true;

    @Column(name = "created_at")
    private LocalDateTime createdAt;

    @Column(name = "updated_at")
    private LocalDateTime updatedAt;

    @Column(name = "last_checked")
    private LocalDateTime lastChecked;

    @Enumerated(EnumType.STRING)
    @Column(name = "current_status")
    @Builder.Default
    private MonitorStatus currentStatus = MonitorStatus.PENDING;

    @Column(name = "expected_status_codes")
    @Builder.Default
    private String expectedStatusCodes = "200,201,202,203,204";

    @Column(name = "timeout_seconds")
    @Builder.Default
    private Integer timeoutSeconds = 30;

    @Column(name = "max_redirects")
    @Builder.Default
    private Integer maxRedirects = 5;

    @Column(columnDefinition = "TEXT")
    private String description;

    @Column(name = "custom_headers", columnDefinition = "TEXT")
    private String customHeaders; // JSON format

    @Column(name = "keyword_check")
    private String keywordCheck;

    @OneToMany(mappedBy = "monitor", cascade = CascadeType.ALL, fetch = FetchType.LAZY)
    @JsonIgnore
    @Builder.Default
    private List<MonitorCheck> checks = new ArrayList<>();

    public enum MonitorType {
        HTTP, HTTPS, TCP, PING, DNS
    }

    public enum MonitorStatus {
        UP, DOWN, PENDING, MAINTENANCE
    }

    @PrePersist
    protected void onCreate() {
        createdAt = LocalDateTime.now();
        updatedAt = LocalDateTime.now();
    }

    @PreUpdate
    protected void onUpdate() {
        updatedAt = LocalDateTime.now();
    }

    // Constructors
    public Monitor() {}

    public Monitor(String name, String url, MonitorType type) {
        this.name = name;
        this.url = url;
        this.type = type;
    }
}