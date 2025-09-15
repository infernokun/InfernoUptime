// src/app/app.component.ts
import { Component, OnDestroy, OnInit } from '@angular/core';
import { ThemeService } from './services/theme.service';
import { Observable, Subscription } from 'rxjs';
import { CommonModule } from '@angular/common';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatToolbarModule } from '@angular/material/toolbar';
import { Router, RouterOutlet } from '@angular/router';
import { MaterialModule } from './material.module';
import { NotificationService } from './services/notification.service';
import { WebSocketService } from './services/websocket.service';

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.scss'],
  imports: [
    CommonModule,
    RouterOutlet,
    MatToolbarModule,
    MatIconModule,
    MatButtonModule,
    MaterialModule
  ],
})
export class AppComponent implements OnInit, OnDestroy {
  title = 'Inferno Uptime';
  isConnected = false;
  totalMonitors = 0;
  activeIncidents = 0;
  systemStats: any = null;
  
  private subscriptions: Subscription[] = [];

  constructor(
    private webSocketService: WebSocketService,
    private notificationService: NotificationService,
    private router: Router
  ) {}

  ngOnInit() {
    this.initializeWebSocket();
    this.subscribeToUpdates();
  }

  ngOnDestroy() {
    this.subscriptions.forEach(sub => sub.unsubscribe());
    this.webSocketService.disconnect();
  }

  private initializeWebSocket() {
    this.webSocketService.connect().subscribe({
      next: (connected) => {
        this.isConnected = connected;
        if (connected) {
          console.log(' Connected to Inferno Uptime WebSocket');
          this.notificationService.showSuccess('Connected to real-time updates');
        } else {
          this.notificationService.showWarning('Disconnected from real-time updates');
        }
      },
      error: (error) => {
        console.error('WebSocket connection error:', error);
        this.isConnected = false;
        this.notificationService.showError('Failed to connect to real-time updates');
      }
    });
  }

  private subscribeToUpdates() {
    // Subscribe to dashboard updates
    const dashboardSub = this.webSocketService.subscribeToDashboard().subscribe(
      (summary) => {
        this.systemStats = summary;
        this.totalMonitors = summary.totalMonitors || 0;
        this.activeIncidents = summary.monitorsDown || 0;
      }
    );

    // Subscribe to monitor updates
    const monitorSub = this.webSocketService.subscribeToMonitors().subscribe(
      (update) => {
        // Handle real-time monitor updates
        if (update.isUp === false) {
          this.notificationService.showError(
            `Monitor "${update.monitorName}" is DOWN`,
            `Response: ${update.statusCode || 'No response'}`
          );
        } else if (update.isUp === true && update.message?.includes('recovered')) {
          this.notificationService.showSuccess(
            `Monitor "${update.monitorName}" is back UP`,
            `Response time: ${update.responseTime}ms`
          );
        }
      }
    );

    this.subscriptions.push(dashboardSub, monitorSub);
  }
}