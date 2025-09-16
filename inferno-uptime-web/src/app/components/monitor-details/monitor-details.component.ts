import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatChipsModule } from '@angular/material/chips';
import { MatTabsModule } from '@angular/material/tabs';
import { MatTableModule } from '@angular/material/table';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { BaseChartDirective } from 'ng2-charts';
import { ChartConfiguration } from 'chart.js';
import { Subscription, interval } from 'rxjs';
import { Monitor, MonitorStats, MonitorCheck, MonitorService } from '../../services/monitor.service';
import { NotificationService } from '../../services/notification.service';
import { WebSocketService, MonitorUpdate } from '../../services/websocket.service';
import { MatDialog } from '@angular/material/dialog';
import { AddMonitorDialogComponent } from '../common/dialog/add-monitor-dialog/add-monitor-dialog.component';

@Component({
  selector: 'app-monitor-details',
  standalone: true,
  imports: [
    CommonModule,
    MatCardModule,
    MatButtonModule,
    MatIconModule,
    MatChipsModule,
    MatTabsModule,
    MatTableModule,
    MatProgressSpinnerModule,
    BaseChartDirective
  ],
  template: `
    <div class="monitor-details-container" *ngIf="monitor">
      <!-- Header -->
      <div class="details-header">
        <button mat-icon-button (click)="goBack()" class="back-button">
          <mat-icon>arrow_back</mat-icon>
        </button>
        <div class="monitor-info">
          <h1>{{ monitor.name }}</h1>
          <p class="monitor-url">{{ monitor.url }}</p>
        </div>
        <div class="header-actions">
          <button mat-icon-button (click)="runCheck()" [disabled]="running" title="Run Check">
            <mat-icon>play_arrow</mat-icon>
          </button>
          <button mat-icon-button (click)="editMonitor()" title="Edit Monitor">
            <mat-icon>edit</mat-icon>
          </button>
        </div>
      </div>

      <!-- Status Overview -->
      <div class="status-overview">
        <mat-card class="status-card">
          <mat-card-content>
            <div class="status-content">
              <div class="status-indicator">
                <mat-icon [style.color]="getStatusColor(monitor.currentStatus)" class="status-icon">
                  {{ getStatusIcon(monitor.currentStatus) }}
                </mat-icon>
                <div class="status-info">
                  <span class="status-text">{{ monitor.currentStatus }}</span>
                  <span class="status-time" *ngIf="monitor.lastChecked">
                    Last checked {{ formatRelativeTime(monitor.lastChecked) }}
                  </span>
                </div>
              </div>
              
              <div class="quick-stats">
                <div class="stat-item">
                  <span class="stat-value">{{ monitor.lastResponseTime || 0 }}ms</span>
                  <span class="stat-label">Response Time</span>
                </div>
                <div class="stat-item" *ngIf="stats">
                  <span class="stat-value">{{ stats.uptime | number:'1.1-1' }}%</span>
                  <span class="stat-label">30-Day Uptime</span>
                </div>
                <div class="stat-item">
                  <span class="stat-value">{{ monitor.checkInterval }}s</span>
                  <span class="stat-label">Check Interval</span>
                </div>
              </div>
            </div>
          </mat-card-content>
        </mat-card>
      </div>

      <!-- Tabs -->
      <mat-tab-group class="details-tabs" animationDuration="300ms">
        <!-- Overview Tab -->
        <mat-tab label="Overview">
          <div class="tab-content">
            <div class="overview-grid">
              <!-- Response Time Chart -->
              <mat-card class="chart-card">
                <mat-card-header>
                  <mat-card-title>Response Time (24h)</mat-card-title>
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

              <!-- Monitor Configuration -->
              <mat-card class="config-card">
                <mat-card-header>
                  <mat-card-title>Configuration</mat-card-title>
                </mat-card-header>
                <mat-card-content>
                  <div class="config-list">
                    <div class="config-item">
                      <span class="config-label">Type:</span>
                      <mat-chip selected>{{ monitor.type }}</mat-chip>
                    </div>
                    <div class="config-item">
                      <span class="config-label">URL:</span>
                      <a [href]="monitor.url" target="_blank" class="config-url">{{ monitor.url }}</a>
                    </div>
                    <div class="config-item">
                      <span class="config-label">Timeout:</span>
                      <span>{{ monitor.timeoutSeconds }}s</span>
                    </div>
                    <div class="config-item">
                      <span class="config-label">Expected Status:</span>
                      <span>{{ monitor.expectedStatusCodes }}</span>
                    </div>
                    <div class="config-item" *ngIf="monitor.keywordCheck">
                      <span class="config-label">Keyword Check:</span>
                      <code>{{ monitor.keywordCheck }}</code>
                    </div>
                    <div class="config-item">
                      <span class="config-label">Active:</span>
                      <mat-chip [color]="monitor.isActive ? 'primary' : 'warn'" selected>
                        {{ monitor.isActive ? 'Yes' : 'No' }}
                      </mat-chip>
                    </div>
                  </div>
                </mat-card-content>
              </mat-card>
            </div>
          </div>
        </mat-tab>

        <!-- Recent Checks Tab -->
        <mat-tab label="Recent Checks">
          <div class="tab-content">
            <mat-card>
              <mat-card-header>
                <mat-card-title>Latest Check Results</mat-card-title>
                <button mat-icon-button (click)="loadChecks()" [disabled]="loadingChecks">
                  <mat-icon>refresh</mat-icon>
                </button>
              </mat-card-header>
              <mat-card-content>
                <div class="table-container" *ngIf="!loadingChecks">
                  <table mat-table [dataSource]="recentChecks" class="checks-table">
                    <!-- Status Column -->
                    <ng-container matColumnDef="status">
                      <th mat-header-cell *matHeaderCellDef>Status</th>
                      <td mat-cell *matCellDef="let check">
                        <mat-icon [style.color]="check.isUp ? '#4caf50' : '#f44336'">
                          {{ check.isUp ? 'check_circle' : 'error' }}
                        </mat-icon>
                      </td>
                    </ng-container>

                    <!-- Timestamp Column -->
                    <ng-container matColumnDef="timestamp">
                      <th mat-header-cell *matHeaderCellDef>Time</th>
                      <td mat-cell *matCellDef="let check">
                        {{ formatDate(check.timestamp) }}
                      </td>
                    </ng-container>

                    <!-- Response Time Column -->
                    <ng-container matColumnDef="responseTime">
                      <th mat-header-cell *matHeaderCellDef>Response Time</th>
                      <td mat-cell *matCellDef="let check">
                        {{ check.responseTime }}ms
                      </td>
                    </ng-container>

                    <!-- Status Code Column -->
                    <ng-container matColumnDef="statusCode">
                      <th mat-header-cell *matHeaderCellDef>Status Code</th>
                      <td mat-cell *matCellDef="let check">
                        <span [class.success-code]="check.statusCode >= 200 && check.statusCode < 300"
                              [class.error-code]="check.statusCode >= 400">
                          {{ check.statusCode || 'N/A' }}
                        </span>
                      </td>
                    </ng-container>

                    <!-- Message Column -->
                    <ng-container matColumnDef="message">
                      <th mat-header-cell *matHeaderCellDef>Message</th>
                      <td mat-cell *matCellDef="let check">
                        {{ check.message }}
                      </td>
                    </ng-container>

                    <tr mat-header-row *matHeaderRowDef="checkColumns"></tr>
                    <tr mat-row *matRowDef="let row; columns: checkColumns;"
                        [class.check-success]="row.isUp"
                        [class.check-failure]="!row.isUp">
                    </tr>
                  </table>
                </div>

                <div class="loading-container" *ngIf="loadingChecks">
                  <mat-spinner diameter="40"></mat-spinner>
                  <p>Loading check history...</p>
                </div>

                <div class="empty-state" *ngIf="!loadingChecks && recentChecks.length === 0">
                  <mat-icon>history</mat-icon>
                  <p>No check history available</p>
                </div>
              </mat-card-content>
            </mat-card>
          </div>
        </mat-tab>

        <!-- Statistics Tab -->
        <mat-tab label="Statistics">
          <div class="tab-content">
            <div class="stats-grid" *ngIf="stats">
              <mat-card class="stat-card">
                <mat-card-content>
                  <div class="stat-content">
                    <mat-icon class="stat-icon">trending_up</mat-icon>
                    <div class="stat-details">
                      <span class="stat-value">{{ stats.uptime | number:'1.2-2' }}%</span>
                      <span class="stat-label">Uptime (30 days)</span>
                    </div>
                  </div>
                </mat-card-content>
              </mat-card>

              <mat-card class="stat-card">
                <mat-card-content>
                  <div class="stat-content">
                    <mat-icon class="stat-icon">speed</mat-icon>
                    <div class="stat-details">
                      <span class="stat-value">{{ stats.averageResponseTime | number:'1.0-0' }}ms</span>
                      <span class="stat-label">Avg Response Time</span>
                    </div>
                  </div>
                </mat-card-content>
              </mat-card>

              <mat-card class="stat-card">
                <mat-card-content>
                  <div class="stat-content">
                    <mat-icon class="stat-icon">check_circle</mat-icon>
                    <div class="stat-details">
                      <span class="stat-value">{{ stats.successfulChecks }}</span>
                      <span class="stat-label">Successful Checks</span>
                    </div>
                  </div>
                </mat-card-content>
              </mat-card>

              <mat-card class="stat-card">
                <mat-card-content>
                  <div class="stat-content">
                    <mat-icon class="stat-icon">error</mat-icon>
                    <div class="stat-details">
                      <span class="stat-value">{{ stats.totalChecks - stats.successfulChecks }}</span>
                      <span class="stat-label">Failed Checks</span>
                    </div>
                  </div>
                </mat-card-content>
              </mat-card>
            </div>
          </div>
        </mat-tab>
      </mat-tab-group>
    </div>

    <!-- Loading State -->
    <div class="loading-container" *ngIf="loading">
      <mat-spinner diameter="50"></mat-spinner>
      <p>Loading monitor details...</p>
    </div>

    <!-- Error State -->
    <div class="error-state" *ngIf="error">
      <mat-icon>error_outline</mat-icon>
      <h2>Failed to load monitor</h2>
      <p>{{ error }}</p>
      <button mat-raised-button color="primary" (click)="retry()">
        <mat-icon>refresh</mat-icon>
        Retry
      </button>
    </div>
  `,
  styleUrls: ['./monitor-details.component.scss']
})
export class MonitorDetailsComponent implements OnInit, OnDestroy {
  monitor: Monitor | null = null;
  stats: MonitorStats | null = null;
  recentChecks: MonitorCheck[] = [];
  
  loading = true;
  loadingChecks = false;
  running = false;
  error: string | null = null;
  isNewMonitor = false;

  checkColumns = ['status', 'timestamp', 'responseTime', 'statusCode', 'message'];

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

  responseTimeChartOptions: ChartConfiguration['options'] = {
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

  private subscriptions: Subscription[] = [];
  private monitorId!: number;

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private monitorService: MonitorService,
    private webSocketService: WebSocketService,
    private notificationService: NotificationService,
    private dialog: MatDialog
  ) {}

  ngOnInit() {
    const idParam = this.route.snapshot.params['id'];
    
    // Check if this is the "new" route
    if (idParam === 'new') {
      this.isNewMonitor = true;
      this.loading = false;
      this.openAddMonitorDialog();
      return;
    }
    
    // Convert to number and validate
    this.monitorId = +idParam;
    
    if (isNaN(this.monitorId) || this.monitorId <= 0) {
      this.error = 'Invalid monitor ID';
      this.loading = false;
      return;
    }
    
    this.loadMonitorDetails();
    this.subscribeToUpdates();
    this.startPeriodicRefresh();
  }

  ngOnDestroy() {
    this.subscriptions.forEach(sub => sub.unsubscribe());
  }

    private openAddMonitorDialog() {
    const dialogRef = this.dialog.open(AddMonitorDialogComponent, {
      width: '600px',
      data: {}
    });

    dialogRef.afterClosed().subscribe(result => {
      if (result) {
        // Navigate back to monitors list
        this.router.navigate(['/monitors']);
      } else {
        // User cancelled, go back to monitors list
        this.router.navigate(['/monitors']);
      }
    });
  }

  private loadMonitorDetails() {
    this.loading = true;
    this.error = null;

    // Load monitor details
    this.monitorService.getMonitor(this.monitorId).subscribe({
      next: (response) => {
        if (response.success) {
          this.monitor = response.data;
          this.loadStats();
          this.loadChecks();
        } else {
          this.error = 'Monitor not found';
        }
        this.loading = false;
      },
      error: (error) => {
        this.error = 'Failed to load monitor details';
        this.loading = false;
        console.error('Error loading monitor:', error);
      }
    });
  }

  private loadStats() {
    this.monitorService.getMonitorStats(this.monitorId, 30).subscribe({
      next: (response) => {
        if (response.success) {
          this.stats = response.data;
        }
      },
      error: (error) => {
        console.error('Error loading stats:', error);
      }
    });
  }

  loadChecks() {
    this.loadingChecks = true;
    
    this.monitorService.getMonitorChecks(this.monitorId, 50).subscribe({
      next: (response) => {
        if (response.success) {
          this.recentChecks = response.data;
          this.updateChart();
        }
        this.loadingChecks = false;
      },
      error: (error) => {
        this.notificationService.showError('Failed to load check history');
        this.loadingChecks = false;
        console.error('Error loading checks:', error);
      }
    });
  }

  private subscribeToUpdates() {
    // Subscribe to real-time updates for this specific monitor
    const updateSub = this.webSocketService.subscribeToSpecificMonitor(this.monitorId).subscribe({
      next: (update: MonitorUpdate) => {
        if (this.monitor) {
          this.monitor.currentStatus = update.isUp ? 'UP' : 'DOWN';
          this.monitor.lastResponseTime = update.responseTime;
          this.monitor.lastStatusCode = update.statusCode;
          this.monitor.lastChecked = update.timestamp;
          
          // Add new check to the beginning of the list
          const newCheck: MonitorCheck = {
            id: Date.now(), // Temporary ID
            timestamp: update.timestamp,
            responseTime: update.responseTime,
            statusCode: update.statusCode,
            isUp: update.isUp,
            message: update.message
          };
          
          this.recentChecks.unshift(newCheck);
          if (this.recentChecks.length > 50) {
            this.recentChecks.pop();
          }
          
          this.updateChart();
        }
      },
      error: (error) => {
        console.error('WebSocket error:', error);
      }
    });

    this.subscriptions.push(updateSub);
  }

  private startPeriodicRefresh() {
    // Refresh stats every 5 minutes
    const refreshSub = interval(300000).subscribe(() => {
      this.loadStats();
    });

    this.subscriptions.push(refreshSub);
  }

  private updateChart() {
    if (this.recentChecks.length === 0) return;

    const labels = this.recentChecks.slice(0, 24).reverse().map(check => 
      new Date(check.timestamp).toLocaleTimeString()
    );
    
    const data = this.recentChecks.slice(0, 24).reverse().map(check => 
      check.responseTime
    );

    this.responseTimeChartData.labels = labels;
    this.responseTimeChartData.datasets[0].data = data;
  }

  runCheck() {
    this.running = true;
    
    this.monitorService.runManualCheck(this.monitorId).subscribe({
      next: (response) => {
        if (response.success) {
          this.notificationService.showSuccess('Check initiated successfully');
        }
        this.running = false;
      },
      error: (error) => {
        this.notificationService.showError('Failed to run check');
        this.running = false;
        console.error('Error running check:', error);
      }
    });
  }

  editMonitor() {
    // Navigate to edit or open edit dialog
    this.router.navigate(['/monitors'], { queryParams: { edit: this.monitorId } });
  }

  goBack() {
    this.router.navigate(['/monitors']);
  }

  retry() {
    this.loadMonitorDetails();
  }

  // Utility methods
  getStatusIcon(status: string): string {
    return this.monitorService.getStatusIcon(status);
  }

  getStatusColor(status: string): string {
    return this.monitorService.getStatusColor(status);
  }

  formatDate(dateString: string): string {
    return new Date(dateString).toLocaleString();
  }

  formatRelativeTime(dateString: string): string {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    
    if (diffMins < 1) return 'just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    
    const diffHours = Math.floor(diffMins / 60);
    if (diffHours < 24) return `${diffHours}h ago`;
    
    const diffDays = Math.floor(diffHours / 24);
    return `${diffDays}d ago`;
  }
}