package com.infernokun.infernoUptime.models.dto;

import com.fasterxml.jackson.annotation.JsonInclude;
import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@NoArgsConstructor
@AllArgsConstructor
@JsonInclude(JsonInclude.Include.NON_NULL)
public class MonitorUpdateRequest {

    @Size(min = 1, max = 255, message = "Monitor name must be between 1 and 255 characters")
    private String name;

    @Pattern(regexp = "^https?://.*", message = "URL must start with http:// or https://")
    private String url;

    @Min(value = 10, message = "Check interval must be at least 10 seconds")
    @Max(value = 3600, message = "Check interval cannot exceed 1 hour")
    private Integer checkInterval;

    @Min(value = 5, message = "Timeout must be at least 5 seconds")
    @Max(value = 300, message = "Timeout cannot exceed 5 minutes")
    private Integer timeoutSeconds;

    @Min(value = 0, message = "Max redirects cannot be negative")
    @Max(value = 10, message = "Max redirects cannot exceed 10")
    private Integer maxRedirects;

    @Size(max = 1000, message = "Description cannot exceed 1000 characters")
    private String description;

    private String expectedStatusCodes;

    @Size(max = 255, message = "Keyword check cannot exceed 255 characters")
    private String keywordCheck;

    @Size(max = 2000, message = "Custom headers cannot exceed 2000 characters")
    private String customHeaders;

    private Boolean isActive;
}
