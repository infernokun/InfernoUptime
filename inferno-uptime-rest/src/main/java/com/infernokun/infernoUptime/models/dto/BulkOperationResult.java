package com.infernokun.infernoUptime.models.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;
import java.util.List;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class BulkOperationResult {

    private Integer totalRequested;
    private Integer successful;
    private Integer failed;
    private Integer skipped;
    private List<String> errors;
    private List<MonitorResponse> createdMonitors;
    private LocalDateTime completedAt;
}
