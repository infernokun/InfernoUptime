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
  standalone: false,
})
export class AppComponent implements OnInit, OnDestroy {
  title = 'Inferno Uptime';
  isConnected = false;
  totalMonitors = 0;
  activeIncidents = 0;
  systemStats: any = null;

  mrouter: Router | undefined;

  private subscriptions: Subscription[] = [];

  constructor(
    private webSocketService: WebSocketService,
    private notificationService: NotificationService,
    private router: Router
  ) {
    this.router = router;
  }

  ngOnInit() {
    this.initializeWebSocket();
    this.subscribeToUpdates();
  }

  ngOnDestroy() {
    this.subscriptions.forEach((sub) => sub.unsubscribe());
    this.webSocketService.disconnect();
  }

  // Fixed app.component.ts WebSocket initialization
  private initializeWebSocket() {
    try {
      // connect() returns an Observable directly, not a Promise
      const connectionObservable = this.webSocketService.connect();

      // Subscribe to the connection status observable
      const connectionSub = connectionObservable.subscribe({
        next: (connected) => {
          this.isConnected = connected;
          if (connected) {
            console.log('✅ Connected to Inferno Uptime WebSocket');
            this.notificationService.showSuccess(
              'Connected to real-time updates'
            );
          } else {
            console.log('❌ Disconnected from Inferno Uptime WebSocket');
            this.notificationService.showWarning(
              'Disconnected from real-time updates'
            );
          }
        },
        error: (error) => {
          console.error('❌ WebSocket connection error:', error);
          this.isConnected = false;
          this.notificationService.showError(
            'Failed to connect to real-time updates'
          );
        },
      });

      // Add the connection subscription to our subscriptions array
      this.subscriptions.push(connectionSub);
    } catch (error) {
      console.error('❌ WebSocket initialization error:', error);
      this.isConnected = false;
      this.notificationService.showError(
        'Failed to initialize real-time connection'
      );
    }
  }

  private subscribeToUpdates() {
    // Subscribe to dashboard updates
    const dashboardSub = this.webSocketService
      .subscribeToDashboard()
      .subscribe((summary) => {
        this.systemStats = summary;
        this.totalMonitors = summary.totalMonitors || 0;
        this.activeIncidents = summary.monitorsDown || 0;
      });

    // Subscribe to monitor updates
    const monitorSub = this.webSocketService
      .subscribeToMonitors()
      .subscribe((update) => {
        // Handle real-time monitor updates
        if (update.isUp === false) {
          this.notificationService.showError(
            `Monitor "${update.monitorName}" is DOWN`,
            `Response: ${update.statusCode || 'No response'}`
          );
        } else if (
          update.isUp === true &&
          update.message?.includes('recovered')
        ) {
          this.notificationService.showSuccess(
            `Monitor "${update.monitorName}" is back UP`,
            `Response time: ${update.responseTime}ms`
          );
        }
      });

    this.subscriptions.push(dashboardSub, monitorSub);
  }

  navigate(path: string[]) {
    this.router.navigate(path);
  }
}