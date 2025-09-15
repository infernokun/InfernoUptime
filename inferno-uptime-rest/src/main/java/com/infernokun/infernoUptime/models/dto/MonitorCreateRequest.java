package com.infernokun.infernoUptime.models.dto;

import com.infernokun.infernoUptime.models.entity.Monitor;
import jakarta.validation.constraints.*;
import lombok.Data;
import lombok.Builder;
import lombok.AllArgsConstructor;
import lombok.NoArgsConstructor;
import com.fasterxml.jackson.annotation.JsonInclude;

import java.time.LocalDateTime;
import java.util.List;

// ======================== Request DTOs ========================

@Data
@NoArgsConstructor
@AllArgsConstructor
@JsonInclude(JsonInclude.Include.NON_NULL)
public class MonitorCreateRequest {

    @NotBlank(message = "Monitor name is required")
    @Size(min = 1, max = 255, message = "Monitor name must be between 1 and 255 characters")
    private String name;

    @NotBlank(message = "URL is required")
    @Pattern(regexp = "^https?://.*", message = "URL must start with http:// or https://")
    private String url;

    @NotNull(message = "Monitor type is required")
    private Monitor.MonitorType type;

    @Min(value = 10, message = "Check interval must be at least 10 seconds")
    @Max(value = 3600, message = "Check interval cannot exceed 1 hour")
    private Integer checkInterval = 30;

    @Min(value = 5, message = "Timeout must be at least 5 seconds")
    @Max(value = 300, message = "Timeout cannot exceed 5 minutes")
    private Integer timeoutSeconds = 30;

    @Min(value = 0, message = "Max redirects cannot be negative")
    @Max(value = 10, message = "Max redirects cannot exceed 10")
    private Integer maxRedirects = 5;

    @Size(max = 1000, message = "Description cannot exceed 1000 characters")
    private String description;

    private String expectedStatusCodes = "200,201,202,203,204";

    @Size(max = 255, message = "Keyword check cannot exceed 255 characters")
    private String keywordCheck;

    @Size(max = 2000, message = "Custom headers cannot exceed 2000 characters")
    private String customHeaders;

    private Boolean isActive = true;
}