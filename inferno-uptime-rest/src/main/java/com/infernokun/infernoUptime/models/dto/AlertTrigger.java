package com.infernokun.infernoUptime.models.dto;

public enum AlertTrigger {
    MONITOR_DOWN,
    MONITOR_UP,
    SLOW_RESPONSE,
    SSL_EXPIRY,
    CONSECUTIVE_FAILURES
}
