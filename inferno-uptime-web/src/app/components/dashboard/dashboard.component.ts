import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatCardModule } from '@angular/material/card';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatGridListModule } from '@angular/material/grid-list';
import { MatChipsModule } from '@angular/material/chips';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { MatTableModule } from '@angular/material/table';
import { MatPaginatorModule, PageEvent } from '@angular/material/paginator';
import { MatMenuModule } from '@angular/material/menu';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatBadgeModule } from '@angular/material/badge';
import { MatDividerModule } from '@angular/material/divider';
import { BaseChartDirective } from 'ng2-charts';
import { ArcElement, CategoryScale, Chart, ChartConfiguration, ChartOptions, Filler, Legend, LinearScale, LineElement, PointElement, Title, Tooltip } from 'chart.js';
import { Subscription, interval } from 'rxjs';
import { Router } from '@angular/router';
import { Monitor, MonitorService } from '../../services/monitor.service';
import { NotificationService } from '../../services/notification.service';
import { DashboardSummary, MonitorUpdate, WebSocketService } from '../../services/websocket.service';

interface MonitorStatusEntry {
  id: number;
  name: string;
  status: 'Up' | 'Down' | 'Pending' | 'Maintenance';
  timestamp: string;
  message: string;
  responseTime?: number;
  statusCode?: number;
  url: string;
}

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
    MatMenuModule,
    MatTooltipModule,
    MatBadgeModule,
    MatDividerModule,
    BaseChartDirective
  ],
  template: `
    <div class="dashboard-container">
      <!-- Header with Quick Actions -->
      <div class="dashboard-header">
        <div class="header-content">
          <div class="title-section">
            <h1>🔥 Inferno Uptime Dashboard</h1>
            <p class="subtitle">Real-time monitoring overview</p>
          </div>
          <div class="quick-actions">
            <button mat-raised-button color="primary" (click)="addNewMonitor()">
              <mat-icon>add</mat-icon>
              Add Monitor
            </button>
            <button mat-icon-button [matMenuTriggerFor]="quickMenu" matTooltip="Quick Actions">
              <mat-icon>more_vert</mat-icon>
            </button>
            <mat-menu #quickMenu="matMenu">
              <button mat-menu-item (click)="navigateToMonitors()">
                <mat-icon>list</mat-icon>
                <span>View All Monitors</span>
              </button>
              <button mat-menu-item (click)="refreshData()">
                <mat-icon>refresh</mat-icon>
                <span>Refresh Data</span>
              </button>
              <button mat-menu-item (click)="navigateToSettings()">
                <mat-icon>settings</mat-icon>
                <span>Settings</span>
              </button>
            </mat-menu>
          </div>
        </div>
      </div>

      <!-- Summary Cards -->
      <div class="summary-grid">
        <mat-card class="summary-card total" (click)="navigateToMonitors()">
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

        <mat-card class="summary-card up" (click)="filterMonitorsByStatus('UP')">
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

        <mat-card class="summary-card down" (click)="filterMonitorsByStatus('DOWN')">
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

      <!-- Main Content Grid -->
      <div class="main-content-grid">
        <!-- Left Column: Charts -->
        <div class="charts-column">
          <!-- Response Time Chart -->
          <mat-card class="chart-card">
            <mat-card-header>
              <mat-card-title>Response Time (Last 24h)</mat-card-title>
              <button mat-icon-button matTooltip="Refresh Chart" (click)="refreshCharts()">
                <mat-icon>refresh</mat-icon>
              </button>
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

        <!-- Right Column: Monitor Status List -->
        <div class="monitor-status-column">
          <mat-card class="monitor-status-card">
            <mat-card-header>
              <mat-card-title>
                Monitor Status 
                <mat-chip-listbox [disabled]="true">
                  <mat-chip-option [color]="getStatusFilterColor(currentStatusFilter)" selected>
                    {{ currentStatusFilter || 'All' }}
                  </mat-chip-option>
                </mat-chip-listbox>
              </mat-card-title>
              <div class="status-actions">
                <button mat-icon-button [matMenuTriggerFor]="statusMenu" matTooltip="Filter by Status">
                  <mat-icon>filter_list</mat-icon>
                </button>
                <mat-menu #statusMenu="matMenu">
                  <button mat-menu-item (click)="setStatusFilter(null)">
                    <mat-icon>clear_all</mat-icon>
                    <span>All Statuses</span>
                  </button>
                  <mat-divider></mat-divider>
                  <button mat-menu-item (click)="setStatusFilter('Up')">
                    <mat-icon style="color: #4caf50;">check_circle</mat-icon>
                    <span>Up Only</span>
                  </button>
                  <button mat-menu-item (click)="setStatusFilter('Down')">
                    <mat-icon style="color: #f44336;">error</mat-icon>
                    <span>Down Only</span>
                  </button>
                  <button mat-menu-item (click)="setStatusFilter('Pending')">
                    <mat-icon style="color: #ff9800;">schedule</mat-icon>
                    <span>Pending Only</span>
                  </button>
                </mat-menu>
                <button mat-icon-button (click)="refreshMonitorStatus()" matTooltip="Refresh Status">
                  <mat-icon>refresh</mat-icon>
                </button>
              </div>
            </mat-card-header>
            <mat-card-content class="status-content">
              <div class="status-list">
                <div class="status-entry" 
                     *ngFor="let entry of getPaginatedStatusEntries()" 
                     [class]="'status-' + entry.status.toLowerCase()"
                     (click)="viewMonitorDetails(entry.id)">
                  <div class="status-info">
                    <div class="status-header">
                      <span class="monitor-name">{{ entry.name }}</span>
                      <div class="status-badge">
                        <mat-chip [color]="getStatusChipColor(entry.status)" selected>
                          {{ entry.status }}
                        </mat-chip>
                      </div>
                    </div>
                    <div class="status-details">
                      <span class="status-time">{{ formatStatusTime(entry.timestamp) }}</span>
                      <span class="status-message">{{ entry.message }}</span>
                    </div>
                    <div class="status-meta" *ngIf="entry.responseTime || entry.statusCode">
                      <span *ngIf="entry.responseTime" class="response-time">{{ entry.responseTime }}ms</span>
                      <span *ngIf="entry.statusCode" class="status-code">HTTP {{ entry.statusCode }}</span>
                    </div>
                  </div>
                  <div class="status-indicator">
                    <mat-icon>{{ getStatusIcon(entry.status) }}</mat-icon>
                  </div>
                </div>
              </div>
              
              <!-- Empty State -->
              <div class="empty-state" *ngIf="getFilteredStatusEntries().length === 0">
                <mat-icon>search_off</mat-icon>
                <p>No monitor status entries found</p>
                <button mat-button color="primary" (click)="setStatusFilter(null)">
                  Clear Filters
                </button>
              </div>

              <!-- Pagination -->
              <mat-paginator
                *ngIf="getFilteredStatusEntries().length > 0"
                [length]="getFilteredStatusEntries().length"
                [pageSize]="statusPageSize"
                [pageSizeOptions]="[5, 10, 20, 50]"
                [pageIndex]="statusPageIndex"
                (page)="onStatusPageChange($event)"
                showFirstLastButtons>
              </mat-paginator>
            </mat-card-content>
          </mat-card>
        </div>
      </div>

      <!-- Recent Activity Section -->
      <div class="activity-section">
        <mat-card>
          <mat-card-header>
            <mat-card-title>Recent Monitor Updates</mat-card-title>
            <div class="activity-actions">
              <mat-chip-listbox [disabled]="true">
                <mat-chip-option color="accent" selected>
                  Last {{ recentUpdates.length }} updates
                </mat-chip-option>
              </mat-chip-listbox>
              <button mat-icon-button (click)="refreshData()" matTooltip="Refresh Updates">
                <mat-icon>refresh</mat-icon>
              </button>
            </div>
          </mat-card-header>
          <mat-card-content>
            <div class="activity-list" *ngIf="recentUpdates.length > 0; else noActivity">
              <div class="activity-item" 
                   *ngFor="let update of recentUpdates; trackBy: trackByUpdateId" 
                   [class.up]="update.isUp" 
                   [class.down]="!update.isUp"
                   (click)="viewMonitorDetails(update.monitorId)">
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
                <button mat-button color="primary" (click)="refreshData()">
                  Refresh Data
                </button>
              </div>
            </ng-template>
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
  
  // Monitor Status List
  monitorStatusEntries: MonitorStatusEntry[] = [];
  currentStatusFilter: string | null = null;
  statusPageIndex = 0;
  statusPageSize = 10;
  
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
      fill: true,
      pointBackgroundColor: '#667eea',
      pointBorderColor: '#fff',
      pointBorderWidth: 2,
      pointRadius: 4
    }]
  };

  responseTimeChartOptions: ChartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    interaction: {
      intersect: false,
      mode: 'index'
    },
    scales: {
      y: {
        beginAtZero: true,
        title: {
          display: true,
          text: 'Response Time (ms)'
        },
        grid: {
          color: 'rgba(0, 0, 0, 0.1)'
        }
      },
      x: {
        grid: {
          color: 'rgba(0, 0, 0, 0.1)'
        }
      }
    },
    plugins: {
      legend: {
        display: false
      },
      tooltip: {
        backgroundColor: 'rgba(0, 0, 0, 0.8)',
        titleColor: '#fff',
        bodyColor: '#fff',
        borderColor: '#667eea',
        borderWidth: 1
      }
    }
  };

  uptimeChartData: ChartConfiguration['data'] = {
    labels: ['Up', 'Down'],
    datasets: [{
      data: [0, 0],
      backgroundColor: ['#4caf50', '#f44336'],
      borderWidth: 2,
      borderColor: '#fff'
    }]
  };

  uptimeChartOptions: ChartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: 'bottom',
        labels: {
          padding: 20,
          usePointStyle: true
        }
      },
      tooltip: {
        backgroundColor: 'rgba(0, 0, 0, 0.8)',
        titleColor: '#fff',
        bodyColor: '#fff'
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
    this.loadMonitorStatusEntries();
    this.subscribeToRealTimeUpdates();
    this.startPeriodicRefresh();
  }

  ngOnDestroy() {
    this.subscriptions.forEach(sub => sub.unsubscribe());
  }

  private loadDashboardData() {
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

    this.monitorService.getActiveMonitors().subscribe({
      next: (response) => {
        if (response.success) {
          this.recentMonitors = response.data;
        }
      }
    });
  }

  private loadMonitorStatusEntries() {
    // This would typically come from your API
    // For now, we'll generate some mock data based on monitors
    this.monitorService.getActiveMonitors().subscribe({
      next: (response) => {
        if (response.success) {
          this.generateMockStatusEntries(response.data);
        }
      }
    });
  }

  private generateMockStatusEntries(monitors: Monitor[]) {
    this.monitorStatusEntries = [];
    monitors.forEach(monitor => {
      // Generate 3-5 status entries per monitor
      const entryCount = Math.floor(Math.random() * 3) + 3;
      for (let i = 0; i < entryCount; i++) {
        const isUp = Math.random() > 0.2; // 80% chance of being up
        const timestamp = new Date(Date.now() - (i * 2 * 60 * 60 * 1000)); // 2 hours apart
        
        this.monitorStatusEntries.push({
          id: monitor.id,
          name: monitor.name,
          url: monitor.url,
          status: isUp ? 'Up' : 'Down',
          timestamp: timestamp.toISOString(),
          message: isUp ? '200 - OK' : 'Request failed with status code 502',
          responseTime: isUp ? Math.floor(Math.random() * 300) + 100 : undefined,
          statusCode: isUp ? 200 : 502
        });
      }
    });
    
    // Sort by timestamp (newest first)
    this.monitorStatusEntries.sort((a, b) => 
      new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
    );
  }

  private subscribeToRealTimeUpdates() {
    const dashboardSub = this.webSocketService.subscribeToDashboard().subscribe(
      (summary) => {
        this.dashboardSummary = summary;
        this.updateCharts();
      }
    );

    const monitorSub = this.webSocketService.subscribeToMonitors().subscribe(
      (update) => {
        this.addRecentUpdate(update);
        this.updateMonitorInList(update);
        this.addStatusEntry(update);
      }
    );

    this.subscriptions.push(dashboardSub, monitorSub);
  }

  private addStatusEntry(update: MonitorUpdate) {
    const newEntry: MonitorStatusEntry = {
      id: update.monitorId,
      name: update.monitorName,
      url: update.url,
      status: update.isUp ? 'Up' : 'Down',
      timestamp: update.timestamp,
      message: update.message,
      responseTime: update.responseTime,
      statusCode: update.statusCode
    };
    
    this.monitorStatusEntries.unshift(newEntry);
    // Keep only last 100 entries
    if (this.monitorStatusEntries.length > 100) {
      this.monitorStatusEntries = this.monitorStatusEntries.slice(0, 100);
    }
  }

  private startPeriodicRefresh() {
    const refreshSub = interval(30000).subscribe(() => {
      this.loadDashboardData();
    });

    this.subscriptions.push(refreshSub);
  }

  private addRecentUpdate(update: MonitorUpdate) {
    this.recentUpdates.unshift(update);
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

    this.uptimeChartData.datasets[0].data = [
      this.dashboardSummary.monitorsUp || 0,
      this.dashboardSummary.monitorsDown || 0
    ];

    this.generateMockResponseTimeData();
  }

  private generateMockResponseTimeData() {
    const labels = [];
    const data = [];
    const now = new Date();
    
    for (let i = 23; i >= 0; i--) {
      const time = new Date(now.getTime() - i * 60 * 60 * 1000);
      labels.push(time.getHours() + ':00');
      data.push(Math.random() * 400 + 150);
    }
    
    this.responseTimeChartData.labels = labels;
    this.responseTimeChartData.datasets[0].data = data;
  }

  // Status list methods
  getFilteredStatusEntries(): MonitorStatusEntry[] {
    if (!this.currentStatusFilter) {
      return this.monitorStatusEntries;
    }
    return this.monitorStatusEntries.filter(entry => 
      entry.status === this.currentStatusFilter
    );
  }

  getPaginatedStatusEntries(): MonitorStatusEntry[] {
    const filtered = this.getFilteredStatusEntries();
    const startIndex = this.statusPageIndex * this.statusPageSize;
    return filtered.slice(startIndex, startIndex + this.statusPageSize);
  }

  onStatusPageChange(event: PageEvent) {
    this.statusPageIndex = event.pageIndex;
    this.statusPageSize = event.pageSize;
  }

  setStatusFilter(status: string | null) {
    this.currentStatusFilter = status;
    this.statusPageIndex = 0; // Reset to first page
  }

  getStatusChipColor(status: string): string {
    switch (status.toLowerCase()) {
      case 'up': return 'primary';
      case 'down': return 'warn';
      case 'pending': return 'accent';
      default: return '';
    }
  }

  getStatusFilterColor(status: string | null): string {
    if (!status) return 'primary';
    return this.getStatusChipColor(status);
  }

  getStatusIcon(status: string): string {
    switch (status.toLowerCase()) {
      case 'up': return 'check_circle';
      case 'down': return 'error';
      case 'pending': return 'schedule';
      case 'maintenance': return 'build';
      default: return 'help';
    }
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

  formatStatusTime(timestamp: string): string {
    const date = new Date(timestamp);
    return date.toLocaleDateString() + ' ' + date.toLocaleTimeString();
  }

  trackByUpdateId(index: number, update: MonitorUpdate): any {
    return update.monitorId + update.timestamp;
  }

  // Navigation methods
  addNewMonitor() {
    this.router.navigate(['/monitors/new']);
  }

  navigateToMonitors() {
    this.router.navigate(['/monitors']);
  }

  navigateToSettings() {
    this.router.navigate(['/settings']);
  }

  filterMonitorsByStatus(status: string) {
    this.router.navigate(['/monitors'], { queryParams: { status: status.toLowerCase() } });
  }

  viewMonitorDetails(id: number) {
    this.router.navigate(['/monitors', id]);
  }

  refreshData() {
    this.loadDashboardData();
    this.loadMonitorStatusEntries();
    this.notificationService.showSuccess('Dashboard refreshed');
  }

  refreshCharts() {
    this.updateCharts();
    this.notificationService.showSuccess('Charts refreshed');
  }

  refreshMonitorStatus() {
    this.loadMonitorStatusEntries();
    this.notificationService.showSuccess('Monitor status refreshed');
  }
}