package com.infernokun.infernoUptime.models.dto;

import jakarta.validation.constraints.NotEmpty;
import jakarta.validation.constraints.NotNull;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.List;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class BulkActionRequest {

    @NotEmpty(message = "Monitor IDs list cannot be empty")
    private List<Long> monitorIds;

    @NotNull(message = "Action is required")
    private BulkAction action;

    // Optional parameters based on action
    private Integer newCheckInterval;
    private Boolean newActiveStatus;
    private String newExpectedStatusCodes;
}
