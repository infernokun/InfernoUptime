package com.infernokun.infernoUptime.models.dto;

import jakarta.validation.constraints.NotNull;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;
import java.util.List;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class ReportRequest {

    @NotNull(message = "Report type is required")
    private ReportType type;

    private List<Long> monitorIds; // null for all monitors

    @NotNull(message = "Start date is required")
    private LocalDateTime startDate;

    @NotNull(message = "End date is required")
    private LocalDateTime endDate;

    private ReportFormat format = ReportFormat.JSON;
    private Boolean includeCharts = false;
    private String emailTo; // for email delivery
}
