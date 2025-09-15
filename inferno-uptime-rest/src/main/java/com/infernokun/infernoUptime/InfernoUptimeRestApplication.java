package com.infernokun.infernoUptime;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.scheduling.annotation.EnableAsync;
import org.springframework.scheduling.annotation.EnableScheduling;

@SpringBootApplication
@EnableScheduling
@EnableAsync
public class InfernoUptimeRestApplication {

	public static void main(String[] args) {
		SpringApplication.run(InfernoUptimeRestApplication.class, args);
		System.out.println("Inferno Uptime is blazing hot and ready to monitor!");
	}
}