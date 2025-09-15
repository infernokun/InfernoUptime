package com.infernokun.infernoUptime.models.dto;

import jakarta.validation.constraints.NotEmpty;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.List;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class BulkMonitorRequest {

    @NotEmpty(message = "Monitor list cannot be empty")
    private List<MonitorCreateRequest> monitors;

    private Boolean skipDuplicates = true;
    private Boolean validateUrls = true;
}
