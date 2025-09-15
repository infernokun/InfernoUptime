package com.infernokun.infernoUptime.models.dto;

import com.fasterxml.jackson.annotation.JsonInclude;
import com.infernokun.infernoUptime.models.entity.Monitor;
import jakarta.validation.constraints.*;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@NoArgsConstructor
@AllArgsConstructor
@JsonInclude(JsonInclude.Include.NON_NULL)
public class MonitorTestRequest {

    @NotBlank(message = "URL is required")
    @Pattern(regexp = "^https?://.*", message = "URL must start with http:// or https://")
    private String url;

    @NotNull(message = "Monitor type is required")
    private Monitor.MonitorType type;

    @Min(value = 5, message = "Timeout must be at least 5 seconds")
    @Max(value = 60, message = "Test timeout cannot exceed 60 seconds")
    private Integer timeoutSeconds = 30;

    private String expectedStatusCodes = "200";
    private String keywordCheck;
    private String customHeaders;
}
