package com.infernokun.infernoUptime.services;

import com.infernokun.infernoUptime.models.entity.Monitor;
import com.infernokun.infernoUptime.models.entity.MonitorCheck;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;

@Slf4j
@Service
public class EmailService {

    public void sendMonitorAlert(Monitor monitor, MonitorCheck check, String message) {
        // Email sending logic would go here
        // This could use Spring Mail or external email service
        log.info("EMAIL ALERT: {}", message);
        log.info("Monitor: {} ({})", monitor.getName(), monitor.getUrl());
        log.info("Status: {}, Response Time: {}ms",
                check.getIsUp() ? "UP" : "DOWN", check.getResponseTime());
    }
}
