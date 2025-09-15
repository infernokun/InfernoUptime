import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatCardModule } from '@angular/material/card';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatGridListModule } from '@angular/material/grid-list';
import { MatChipsModule } from '@angular/material/chips';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { MatTableModule } from '@angular/material/table';
import { MatPaginatorModule } from '@angular/material/paginator';
import { BaseChartDirective } from 'ng2-charts';
import { ArcElement, CategoryScale, Chart, ChartConfiguration, ChartOptions, Filler, Legend, LinearScale, LineElement, PointElement, Title, Tooltip } from 'chart.js';
import { Subscription, interval } from 'rxjs';
import { Router } from '@angular/router';
import { Monitor, MonitorService } from '../../services/monitor.service';
import { NotificationService } from '../../services/notification.service';
import { DashboardSummary, MonitorUpdate, WebSocketService } from '../../services/websocket.service';

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [
    CommonModule,
    MatCardModule,
    MatIconModule,
    MatButtonModule,
    MatGridListModule,
    MatChipsModule,
    MatProgressBarModule,
    MatTableModule,
    MatPaginatorModule,
    BaseChartDirective
  ],
  template: `
    <div class="dashboard-container">
      <!-- Header -->
      <div class="dashboard-header">
        <h1> Inferno Uptime Dashboard</h1>
        <p class="subtitle">Real-time monitoring overview</p>
      </div>

      <!-- Summary Cards -->
      <div class="summary-grid">
        <mat-card class="summary-card total">
          <mat-card-content>
            <div class="stat-content">
              <mat-icon>monitor</mat-icon>
              <div class="stat-details">
                <span class="stat-value">{{ dashboardSummary?.totalMonitors || 0 }}</span>
                <span class="stat-label">Total Monitors</span>
              </div>
            </div>
          </mat-card-content>
        </mat-card>

        <mat-card class="summary-card up">
          <mat-card-content>
            <div class="stat-content">
              <mat-icon>check_circle</mat-icon>
              <div class="stat-details">
                <span class="stat-value">{{ dashboardSummary?.monitorsUp || 0 }}</span>
                <span class="stat-label">Up</span>
              </div>
            </div>
          </mat-card-content>
        </mat-card>

        <mat-card class="summary-card down">
          <mat-card-content>
            <div class="stat-content">
              <mat-icon>error</mat-icon>
              <div class="stat-details">
                <span class="stat-value">{{ dashboardSummary?.monitorsDown || 0 }}</span>
                <span class="stat-label">Down</span>
              </div>
            </div>
          </mat-card-content>
        </mat-card>

        <mat-card class="summary-card uptime">
          <mat-card-content>
            <div class="stat-content">
              <mat-icon>trending_up</mat-icon>
              <div class="stat-details">
                <span class="stat-value">{{ (dashboardSummary?.overallUptime || 0) | number:'1.1-1' }}%</span>
                <span class="stat-label">Overall Uptime</span>
              </div>
            </div>
          </mat-card-content>
        </mat-card>

        <mat-card class="summary-card response-time">
          <mat-card-content>
            <div class="stat-content">
              <mat-icon>speed</mat-icon>
              <div class="stat-details">
                <span class="stat-value">{{ formatResponseTime(dashboardSummary?.averageResponseTime || 0) }}</span>
                <span class="stat-label">Avg Response</span>
              </div>
            </div>
          </mat-card-content>
        </mat-card>

        <mat-card class="summary-card checks">
          <mat-card-content>
            <div class="stat-content">
              <mat-icon>assessment</mat-icon>
              <div class="stat-details">
                <span class="stat-value">{{ dashboardSummary?.totalChecksToday || 0 }}</span>
                <span class="stat-label">Checks Today</span>
              </div>
            </div>
          </mat-card-content>
        </mat-card>
      </div>

      <!-- Charts Row -->
      <div class="charts-row">
        <!-- Response Time Chart -->
        <mat-card class="chart-card">
          <mat-card-header>
            <mat-card-title>Response Time (Last 24h)</mat-card-title>
          </mat-card-header>
          <mat-card-content>
            <div class="chart-container">
              <canvas baseChart
                      [data]="responseTimeChartData"
                      [options]="responseTimeChartOptions"
                      [type]="'line'">
              </canvas>
            </div>
          </mat-card-content>
        </mat-card>

        <!-- Uptime Chart -->
        <mat-card class="chart-card">
          <mat-card-header>
            <mat-card-title>Uptime Distribution</mat-card-title>
          </mat-card-header>
          <mat-card-content>
            <div class="chart-container">
              <canvas baseChart
                      [data]="uptimeChartData"
                      [options]="uptimeChartOptions"
                      [type]="'doughnut'">
              </canvas>
            </div>
          </mat-card-content>
        </mat-card>
      </div>

      <!-- Recent Activity -->
      <div class="activity-section">
        <mat-card>
          <mat-card-header>
            <mat-card-title>Recent Monitor Updates</mat-card-title>
            <button mat-icon-button (click)="refreshData()">
              <mat-icon>refresh</mat-icon>
            </button>
          </mat-card-header>
          <mat-card-content>
            <div class="activity-list" *ngIf="recentUpdates.length > 0; else noActivity">
              <div class="activity-item" 
                   *ngFor="let update of recentUpdates" 
                   [class.up]="update.isUp" 
                   [class.down]="!update.isUp">
                <div class="activity-icon">
                  <mat-icon>{{ update.isUp ? 'check_circle' : 'error' }}</mat-icon>
                </div>
                <div class="activity-content">
                  <div class="activity-title">{{ update.monitorName }}</div>
                  <div class="activity-subtitle">
                    {{ update.url }} • {{ update.message }}
                  </div>
                  <div class="activity-meta">
                    <span>{{ formatTime(update.timestamp) }}</span>
                    <span *ngIf="update.responseTime">• {{ update.responseTime }}ms</span>
                    <span *ngIf="update.statusCode">• HTTP {{ update.statusCode }}</span>
                  </div>
                </div>
                <div class="activity-status">
                  <mat-chip [color]="update.isUp ? 'primary' : 'warn'" selected>
                    {{ update.isUp ? 'UP' : 'DOWN' }}
                  </mat-chip>
                </div>
              </div>
            </div>
            
            <ng-template #noActivity>
              <div class="no-activity">
                <mat-icon>history</mat-icon>
                <p>No recent updates</p>
              </div>
            </ng-template>
          </mat-card-content>
        </mat-card>
      </div>

      <!-- Monitor Status Overview -->
      <div class="monitors-overview">
        <mat-card>
          <mat-card-header>
            <mat-card-title>Monitor Status Overview</mat-card-title>
            <button mat-button color="primary" (click)="navigateToMonitors()">
              View All Monitors
            </button>
          </mat-card-header>
          <mat-card-content>
            <div class="monitor-grid">
              <div class="monitor-item" 
                   *ngFor="let monitor of recentMonitors" 
                   [class]="getMonitorClass(monitor)"
                   (click)="viewMonitorDetails(monitor.id)">
                <div class="monitor-status">
                  <mat-icon>{{ getStatusIcon(monitor.currentStatus) }}</mat-icon>
                </div>
                <div class="monitor-info">
                  <div class="monitor-name">{{ monitor.name }}</div>
                  <div class="monitor-url">{{ monitor.url }}</div>
                  <div class="monitor-meta">
                    <span *ngIf="monitor.lastResponseTime">{{ monitor.lastResponseTime }}ms</span>
                    <span *ngIf="monitor.uptimePercentage">{{ monitor.uptimePercentage | number:'1.1-1' }}%</span>
                  </div>
                </div>
                <div class="monitor-indicator">
                  <div class="status-dot" [style.background-color]="getStatusColor(monitor.currentStatus)"></div>
                </div>
              </div>
            </div>
          </mat-card-content>
        </mat-card>
      </div>
    </div>
  `,
  styleUrls: ['./dashboard.component.scss']
})
export class DashboardComponent implements OnInit, OnDestroy {
  dashboardSummary: DashboardSummary | null = null;
  recentUpdates: MonitorUpdate[] = [];
  recentMonitors: Monitor[] = [];
  
  private subscriptions: Subscription[] = [];

  // Chart data
  responseTimeChartData: ChartConfiguration['data'] = {
    labels: [],
    datasets: [{
      label: 'Response Time (ms)',
      data: [],
      borderColor: '#667eea',
      backgroundColor: 'rgba(102, 126, 234, 0.1)',
      tension: 0.4,
      fill: true
    }]
  };

  responseTimeChartOptions: ChartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    scales: {
      y: {
        beginAtZero: true,
        title: {
          display: true,
          text: 'Response Time (ms)'
        }
      }
    },
    plugins: {
      legend: {
        display: false
      }
    }
  };

  uptimeChartData: ChartConfiguration['data'] = {
    labels: ['Up', 'Down'],
    datasets: [{
      data: [0, 0],
      backgroundColor: ['#4caf50', '#f44336'],
      borderWidth: 0
    }]
  };

  uptimeChartOptions: ChartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: 'bottom'
      }
    }
  };

  constructor(
    private monitorService: MonitorService,
    private webSocketService: WebSocketService,
    private notificationService: NotificationService,
    private router: Router
  ) {
    Chart.register(
        CategoryScale,
        LinearScale,
        PointElement,
        LineElement,
        Title,
        Tooltip,
        Legend,
        ArcElement,
        Filler
      );
  }

  ngOnInit() {
    this.loadDashboardData();
    this.subscribeToRealTimeUpdates();
    this.startPeriodicRefresh();
  }

  ngOnDestroy() {
    this.subscriptions.forEach(sub => sub.unsubscribe());
  }

  private loadDashboardData() {
    // Load dashboard summary
    this.monitorService.getDashboardSummary().subscribe({
      next: (response) => {
        if (response.success) {
          this.dashboardSummary = response.data;
          this.updateCharts();
        }
      },
      error: (error) => {
        this.notificationService.showError('Failed to load dashboard data');
        console.error('Dashboard error:', error);
      }
    });

    // Load recent monitors
    this.monitorService.getActiveMonitors().subscribe({
      next: (response) => {
        if (response.success) {
          this.recentMonitors = response.data.slice(0, 8); // Show first 8
        }
      }
    });
  }

  private subscribeToRealTimeUpdates() {
    // Subscribe to dashboard updates
    const dashboardSub = this.webSocketService.subscribeToDashboard().subscribe(
      (summary) => {
        this.dashboardSummary = summary;
        this.updateCharts();
      }
    );

    // Subscribe to monitor updates
    const monitorSub = this.webSocketService.subscribeToMonitors().subscribe(
      (update) => {
        this.addRecentUpdate(update);
        this.updateMonitorInList(update);
      }
    );

    this.subscriptions.push(dashboardSub, monitorSub);
  }

  private startPeriodicRefresh() {
    // Refresh data every 30 seconds
    const refreshSub = interval(30000).subscribe(() => {
      this.loadDashboardData();
    });

    this.subscriptions.push(refreshSub);
  }

  private addRecentUpdate(update: MonitorUpdate) {
    this.recentUpdates.unshift(update);
    // Keep only last 10 updates
    if (this.recentUpdates.length > 10) {
      this.recentUpdates = this.recentUpdates.slice(0, 10);
    }
  }

  private updateMonitorInList(update: MonitorUpdate) {
    const index = this.recentMonitors.findIndex(m => m.id === update.monitorId);
    if (index !== -1) {
      this.recentMonitors[index].currentStatus = update.isUp ? 'UP' : 'DOWN';
      this.recentMonitors[index].lastResponseTime = update.responseTime;
      this.recentMonitors[index].lastStatusCode = update.statusCode;
    }
  }

  private updateCharts() {
    if (!this.dashboardSummary) return;

    // Update uptime chart
    this.uptimeChartData.datasets[0].data = [
      this.dashboardSummary.monitorsUp || 0,
      this.dashboardSummary.monitorsDown || 0
    ];

    // Generate mock response time data (in real app, this would come from API)
    this.generateMockResponseTimeData();
  }

  private generateMockResponseTimeData() {
    const labels = [];
    const data = [];
    const now = new Date();
    
    for (let i = 23; i >= 0; i--) {
      const time = new Date(now.getTime() - i * 60 * 60 * 1000);
      labels.push(time.getHours() + ':00');
      data.push(Math.random() * 500 + 100); // Mock data between 100-600ms
    }
    
    this.responseTimeChartData.labels = labels;
    this.responseTimeChartData.datasets[0].data = data;
  }

  // Utility methods
  formatResponseTime(ms: number): string {
    if (!ms || ms < 1000) {
      return `${Math.round(ms || 0)}ms`;
    }
    return `${(ms / 1000).toFixed(2)}s`;
  }

  formatTime(timestamp: string): string {
    return new Date(timestamp).toLocaleTimeString();
  }

  getStatusIcon(status: string): string {
    return this.monitorService.getStatusIcon(status);
  }

  getStatusColor(status: string): string {
    return this.monitorService.getStatusColor(status);
  }

  getMonitorClass(monitor: Monitor): string {
    return `monitor-${monitor.currentStatus.toLowerCase()}`;
  }

  refreshData() {
    this.loadDashboardData();
    this.notificationService.showSuccess('Dashboard refreshed');
  }

  navigateToMonitors() {
    this.router.navigate(['/monitors']);
  }

  viewMonitorDetails(id: number) {
    this.router.navigate(['/monitors', id]);
  }
}