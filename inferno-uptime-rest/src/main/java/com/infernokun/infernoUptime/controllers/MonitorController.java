package com.infernokun.infernoUptime.controllers;

import com.infernokun.infernoUptime.models.dto.*;
import com.infernokun.infernoUptime.models.entity.Monitor;
import com.infernokun.infernoUptime.models.entity.MonitorCheck;
import com.infernokun.infernoUptime.services.DashboardService;
import com.infernokun.infernoUptime.services.MonitorCheckService;
import com.infernokun.infernoUptime.services.MonitorService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.Parameter;
import io.swagger.v3.oas.annotations.responses.ApiResponse;
import io.swagger.v3.oas.annotations.responses.ApiResponses;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.web.PageableDefault;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@Slf4j
@RestController
@RequestMapping("/api/v1/monitors")
@RequiredArgsConstructor
@Tag(name = "Monitors", description = "Monitor management and health checking")
@CrossOrigin(origins = {"http://localhost:4200", "${inferno.uptime.cors.allowed-origins:}"})
public class MonitorController {

    private final MonitorService monitorService;
    private final MonitorCheckService monitorCheckService;
    private final DashboardService dashboardService;

    @Operation(summary = "Create a new monitor", description = "Creates a new uptime monitor")
    @ApiResponses(value = {
            @ApiResponse(responseCode = "201", description = "Monitor created successfully"),
            @ApiResponse(responseCode = "400", description = "Invalid request data")
    })
    @PostMapping
    public ResponseEntity<com.infernokun.infernoUptime.models.dto.ApiResponse<MonitorResponse>> createMonitor(
            @Valid @RequestBody MonitorCreateRequest request) {

        log.info("Creating new monitor: {}", request.getName());
        MonitorResponse response = monitorService.createMonitor(request);

        return ResponseEntity.status(HttpStatus.CREATED)
                .body(com.infernokun.infernoUptime.models.dto.ApiResponse.success("Monitor created successfully", response));
    }

    @Operation(summary = "Get all monitors", description = "Retrieves all monitors with pagination and filtering")
    @GetMapping
    public ResponseEntity<com.infernokun.infernoUptime.models.dto.ApiResponse<Page<MonitorResponse>>> getAllMonitors(
            @PageableDefault(size = 20) Pageable pageable,
            @Parameter(description = "Search by monitor name")
            @RequestParam(required = false) String search,
            @Parameter(description = "Filter by monitor status")
            @RequestParam(required = false) Monitor.MonitorStatus status) {

        Page<MonitorResponse> monitors = monitorService.getAllMonitors(pageable, search, status);

        return ResponseEntity.ok(
                com.infernokun.infernoUptime.models.dto.ApiResponse.success("Monitors retrieved successfully", monitors));
    }

    @Operation(summary = "Get active monitors", description = "Retrieves all active monitors (cached)")
    @GetMapping("/active")
    public ResponseEntity<com.infernokun.infernoUptime.models.dto.ApiResponse<List<MonitorResponse>>> getActiveMonitors() {
        List<MonitorResponse> monitors = monitorService.getActiveMonitors();

        return ResponseEntity.ok(
                com.infernokun.infernoUptime.models.dto.ApiResponse.success("Active monitors retrieved successfully", monitors));
    }

    @Operation(summary = "Get monitor by ID", description = "Retrieves a specific monitor by its ID")
    @ApiResponses(value = {
            @ApiResponse(responseCode = "200", description = "Monitor found"),
            @ApiResponse(responseCode = "404", description = "Monitor not found")
    })
    @GetMapping("/{id}")
    public ResponseEntity<com.infernokun.infernoUptime.models.dto.ApiResponse<MonitorResponse>> getMonitor(
            @Parameter(description = "Monitor ID") @PathVariable Long id) {

        MonitorResponse response = monitorService.getMonitor(id);

        return ResponseEntity.ok(
                com.infernokun.infernoUptime.models.dto.ApiResponse.success("Monitor retrieved successfully", response));
    }

    @Operation(summary = "Update monitor", description = "Updates an existing monitor")
    @ApiResponses(value = {
            @ApiResponse(responseCode = "200", description = "Monitor updated successfully"),
            @ApiResponse(responseCode = "404", description = "Monitor not found")
    })
    @PutMapping("/{id}")
    public ResponseEntity<com.infernokun.infernoUptime.models.dto.ApiResponse<MonitorResponse>> updateMonitor(
            @Parameter(description = "Monitor ID") @PathVariable Long id,
            @Valid @RequestBody MonitorUpdateRequest request) {

        log.info("Updating monitor ID: {}", id);
        MonitorResponse response = monitorService.updateMonitor(id, request);

        return ResponseEntity.ok(
                com.infernokun.infernoUptime.models.dto.ApiResponse.success("Monitor updated successfully", response));
    }

    @Operation(summary = "Delete monitor", description = "Soft deletes a monitor (sets inactive)")
    @ApiResponses(value = {
            @ApiResponse(responseCode = "200", description = "Monitor deleted successfully"),
            @ApiResponse(responseCode = "404", description = "Monitor not found")
    })
    @DeleteMapping("/{id}")
    public ResponseEntity<com.infernokun.infernoUptime.models.dto.ApiResponse<Void>> deleteMonitor(
            @Parameter(description = "Monitor ID") @PathVariable Long id) {

        log.info("Deleting monitor ID: {}", id);
        monitorService.deleteMonitor(id);

        return ResponseEntity.ok(
                com.infernokun.infernoUptime.models.dto.ApiResponse.success("Monitor deleted successfully", null));
    }

    @Operation(summary = "Toggle monitor status", description = "Toggles monitor active/inactive status")
    @PostMapping("/{id}/toggle")
    public ResponseEntity<com.infernokun.infernoUptime.models.dto.ApiResponse<Void>> toggleMonitorStatus(
            @Parameter(description = "Monitor ID") @PathVariable Long id) {

        monitorService.toggleMonitorStatus(id);

        return ResponseEntity.ok(
                com.infernokun.infernoUptime.models.dto.ApiResponse.success("Monitor status toggled successfully", null));
    }

    @Operation(summary = "Get monitor statistics", description = "Retrieves uptime statistics for a monitor")
    @GetMapping("/{id}/stats")
    public ResponseEntity<com.infernokun.infernoUptime.models.dto.ApiResponse<MonitorStats>> getMonitorStats(
            @Parameter(description = "Monitor ID") @PathVariable Long id,
            @Parameter(description = "Number of days to analyze")
            @RequestParam(defaultValue = "30") int days) {

        MonitorStats stats = monitorService.getMonitorStats(id, days);

        return ResponseEntity.ok(
                com.infernokun.infernoUptime.models.dto.ApiResponse.success("Monitor statistics retrieved successfully", stats));
    }

    @Operation(summary = "Get monitor check history", description = "Retrieves recent check results for a monitor")
    @GetMapping("/{id}/checks")
    public ResponseEntity<com.infernokun.infernoUptime.models.dto.ApiResponse<List<MonitorCheck>>> getMonitorChecks(
            @Parameter(description = "Monitor ID") @PathVariable Long id,
            @Parameter(description = "Number of recent checks to retrieve")
            @RequestParam(defaultValue = "100") int limit) {

        List<MonitorCheck> checks = monitorService.getMonitorChecks(id, limit);

        return ResponseEntity.ok(
                com.infernokun.infernoUptime.models.dto.ApiResponse.success("Monitor checks retrieved successfully", checks));
    }

    @Operation(summary = "Run manual check", description = "Triggers an immediate health check for a monitor")
    @PostMapping("/{id}/check")
    public ResponseEntity<com.infernokun.infernoUptime.models.dto.ApiResponse<String>> runManualCheck(
            @Parameter(description = "Monitor ID") @PathVariable Long id) {

        log.info("Running manual check for monitor ID: {}", id);

        MonitorResponse monitor = monitorService.getMonitor(id);
        // Trigger the actual check asynchronously
        monitorCheckService.triggerImmediateCheck(id);

        return ResponseEntity.ok(
                com.infernokun.infernoUptime.models.dto.ApiResponse.success("Manual check triggered successfully",
                        "Check initiated for monitor: " + monitor.getName()));
    }

    @Operation(summary = "Get dashboard summary", description = "Retrieves summary statistics for the dashboard")
    @GetMapping("/dashboard/summary")
    public ResponseEntity<com.infernokun.infernoUptime.models.dto.ApiResponse<DashboardSummary>> getDashboardSummary() {
        DashboardSummary summary = dashboardService.getDashboardSummary();

        return ResponseEntity.ok(
                com.infernokun.infernoUptime.models.dto.ApiResponse.success("Dashboard summary retrieved successfully", summary));
    }
}