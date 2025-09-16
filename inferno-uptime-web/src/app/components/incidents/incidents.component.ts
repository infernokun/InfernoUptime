import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatTableModule } from '@angular/material/table';
import { MatChipsModule } from '@angular/material/chips';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatSelectModule } from '@angular/material/select';
import { MatInputModule } from '@angular/material/input';
import { FormsModule } from '@angular/forms';

interface Incident {
  id: number;
  monitorName: string;
  monitorUrl: string;
  startTime: string;
  endTime?: string;
  duration: number; // minutes
  status: 'ONGOING' | 'RESOLVED';
  severity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  description: string;
}

@Component({
  selector: 'app-incidents',
  standalone: true,
  imports: [
    CommonModule,
    MatCardModule,
    MatButtonModule,
    MatIconModule,
    MatTableModule,
    MatChipsModule,
    MatFormFieldModule,
    MatSelectModule,
    MatInputModule,
    FormsModule
  ],
  template: `
    <div class="incidents-container">
      <!-- Header -->
      <div class="incidents-header">
        <div class="header-content">
          <h1>🚨 Incidents</h1>
          <p class="subtitle">Monitor outages and incident history</p>
        </div>
        <div class="header-stats">
          <div class="stat-card ongoing">
            <span class="stat-value">{{ getOngoingCount() }}</span>
            <span class="stat-label">Ongoing</span>
          </div>
          <div class="stat-card resolved">
            <span class="stat-value">{{ getResolvedTodayCount() }}</span>
            <span class="stat-label">Resolved Today</span>
          </div>
        </div>
      </div>

      <!-- Filters -->
      <mat-card class="filters-card">
        <mat-card-content>
          <div class="filters-row">
            <mat-form-field appearance="outline">
              <mat-label>Status</mat-label>
              <mat-select [(ngModel)]="statusFilter" (selectionChange)="applyFilters()">
                <mat-option value="">All Statuses</mat-option>
                <mat-option value="ONGOING">Ongoing</mat-option>
                <mat-option value="RESOLVED">Resolved</mat-option>
              </mat-select>
            </mat-form-field>

            <mat-form-field appearance="outline">
              <mat-label>Severity</mat-label>
              <mat-select [(ngModel)]="severityFilter" (selectionChange)="applyFilters()">
                <mat-option value="">All Severities</mat-option>
                <mat-option value="CRITICAL">Critical</mat-option>
                <mat-option value="HIGH">High</mat-option>
                <mat-option value="MEDIUM">Medium</mat-option>
                <mat-option value="LOW">Low</mat-option>
              </mat-select>
            </mat-form-field>

            <mat-form-field appearance="outline" class="search-field">
              <mat-label>Search monitors</mat-label>
              <input matInput [(ngModel)]="searchQuery" (keyup)="applyFilters()" 
                     placeholder="Search by monitor name">
              <mat-icon matSuffix>search</mat-icon>
            </mat-form-field>

            <button mat-icon-button (click)="refreshIncidents()" title="Refresh">
              <mat-icon>refresh</mat-icon>
            </button>
          </div>
        </mat-card-content>
      </mat-card>

      <!-- Ongoing Incidents Alert -->
      <mat-card class="alert-card" *ngIf="getOngoingIncidents().length > 0">
        <mat-card-content>
          <div class="alert-content">
            <mat-icon class="alert-icon">warning</mat-icon>
            <div class="alert-info">
              <h3>{{ getOngoingIncidents().length }} Ongoing Incident(s)</h3>
              <p>Some monitors are currently experiencing issues</p>
            </div>
            <button mat-raised-button color="warn" (click)="showOngoingOnly()">
              View Ongoing
            </button>
          </div>
        </mat-card-content>
      </mat-card>

      <!-- Incidents Table -->
      <mat-card class="table-card">
        <mat-card-header>
          <mat-card-title>Incident History</mat-card-title>
        </mat-card-header>
        <mat-card-content>
          <div class="table-container">
            <table mat-table [dataSource]="filteredIncidents" class="incidents-table">
              <!-- Status Column -->
              <ng-container matColumnDef="status">
                <th mat-header-cell *matHeaderCellDef>Status</th>
                <td mat-cell *matCellDef="let incident">
                  <mat-chip [color]="getStatusColor(incident.status)" selected>
                    {{ incident.status }}
                  </mat-chip>
                </td>
              </ng-container>

              <!-- Severity Column -->
              <ng-container matColumnDef="severity">
                <th mat-header-cell *matHeaderCellDef>Severity</th>
                <td mat-cell *matCellDef="let incident">
                  <mat-chip [color]="getSeverityColor(incident.severity)" selected>
                    {{ incident.severity }}
                  </mat-chip>
                </td>
              </ng-container>

              <!-- Monitor Column -->
              <ng-container matColumnDef="monitor">
                <th mat-header-cell *matHeaderCellDef>Monitor</th>
                <td mat-cell *matCellDef="let incident">
                  <div class="monitor-cell">
                    <div class="monitor-name">{{ incident.monitorName }}</div>
                    <div class="monitor-url">{{ incident.monitorUrl }}</div>
                  </div>
                </td>
              </ng-container>

              <!-- Duration Column -->
              <ng-container matColumnDef="duration">
                <th mat-header-cell *matHeaderCellDef>Duration</th>
                <td mat-cell *matCellDef="let incident">
                  <div class="duration-cell">
                    {{ formatDuration(incident.duration) }}
                    <div class="duration-bar" 
                         [style.width]="getDurationBarWidth(incident.duration) + '%'"
                         [style.background-color]="getSeverityColor(incident.severity)">
                    </div>
                  </div>
                </td>
              </ng-container>

              <!-- Start Time Column -->
              <ng-container matColumnDef="startTime">
                <th mat-header-cell *matHeaderCellDef>Started</th>
                <td mat-cell *matCellDef="let incident">
                  {{ formatDate(incident.startTime) }}
                </td>
              </ng-container>

              <!-- End Time Column -->
              <ng-container matColumnDef="endTime">
                <th mat-header-cell *matHeaderCellDef>Resolved</th>
                <td mat-cell *matCellDef="let incident">
                  {{ incident.endTime ? formatDate(incident.endTime) : 'Ongoing' }}
                </td>
              </ng-container>

              <!-- Description Column -->
              <ng-container matColumnDef="description">
                <th mat-header-cell *matHeaderCellDef>Description</th>
                <td mat-cell *matCellDef="let incident">
                  <div class="description-cell" [title]="incident.description">
                    {{ incident.description }}
                  </div>
                </td>
              </ng-container>

              <tr mat-header-row *matHeaderRowDef="displayedColumns"></tr>
              <tr mat-row *matRowDef="let row; columns: displayedColumns;"
                  [class.ongoing-row]="row.status === 'ONGOING'"
                  [class.critical-row]="row.severity === 'CRITICAL'">
              </tr>
            </table>
          </div>

          <!-- Empty State -->
          <div class="empty-state" *ngIf="filteredIncidents.length === 0">
            <mat-icon>{{ hasFilters() ? 'filter_list_off' : 'check_circle' }}</mat-icon>
            <h3>{{ hasFilters() ? 'No incidents match your filters' : 'No incidents found' }}</h3>
            <p>{{ hasFilters() ? 'Try adjusting your search criteria' : 'Great! All your monitors are running smoothly' }}</p>
            <button mat-button (click)="clearFilters()" *ngIf="hasFilters()">
              Clear Filters
            </button>
          </div>
        </mat-card-content>
      </mat-card>

      <!-- Statistics -->
      <div class="stats-grid">
        <mat-card class="stats-card">
          <mat-card-header>
            <mat-card-title>Incident Statistics</mat-card-title>
          </mat-card-header>
          <mat-card-content>
            <div class="stats-content">
              <div class="stat-item">
                <span class="stat-number">{{ getTotalIncidents() }}</span>
                <span class="stat-label">Total Incidents</span>
              </div>
              <div class="stat-item">
                <span class="stat-number">{{ getAverageResolutionTime() }}</span>
                <span class="stat-label">Avg Resolution Time</span>
              </div>
              <div class="stat-item">
                <span class="stat-number">{{ getMTTR() }}</span>
                <span class="stat-label">MTTR (This Month)</span>
              </div>
              <div class="stat-item">
                <span class="stat-number">{{ getIncidentRate() }}%</span>
                <span class="stat-label">Incident Rate</span>
              </div>
            </div>
          </mat-card-content>
        </mat-card>
      </div>
    </div>
  `,
  styleUrls: ['./incidents.component.scss']
})
export class IncidentsComponent implements OnInit {
  incidents: Incident[] = [];
  filteredIncidents: Incident[] = [];
  
  statusFilter = '';
  severityFilter = '';
  searchQuery = '';
  
  displayedColumns = ['status', 'severity', 'monitor', 'duration', 'startTime', 'endTime', 'description'];

  constructor() {}

  ngOnInit() {
    this.loadMockIncidents();
    this.applyFilters();
  }

  private loadMockIncidents() {
    // Mock data - in real app, this would come from API
    this.incidents = [
      {
        id: 1,
        monitorName: 'Main Website',
        monitorUrl: 'https://example.com',
        startTime: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(), // 2 hours ago
        endTime: new Date(Date.now() - 1 * 60 * 60 * 1000).toISOString(), // 1 hour ago
        duration: 60, // 1 hour
        status: 'RESOLVED',
        severity: 'HIGH',
        description: 'Server returned 500 errors due to database connection issues'
      },
      {
        id: 2,
        monitorName: 'API Endpoint',
        monitorUrl: 'https://api.example.com/health',
        startTime: new Date(Date.now() - 30 * 60 * 1000).toISOString(), // 30 minutes ago
        duration: 30,
        status: 'ONGOING',
        severity: 'CRITICAL',
        description: 'API responding with timeout errors'
      },
      {
        id: 3,
        monitorName: 'CDN Status',
        monitorUrl: 'https://cdn.example.com',
        startTime: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(), // 1 day ago
        endTime: new Date(Date.now() - 23 * 60 * 60 * 1000).toISOString(), // 23 hours ago
        duration: 45,
        status: 'RESOLVED',
        severity: 'MEDIUM',
        description: 'CDN experienced intermittent connectivity issues'
      },
      {
        id: 4,
        monitorName: 'Database Monitor',
        monitorUrl: 'tcp://db.example.com:5432',
        startTime: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString(), // 3 days ago
        endTime: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000 + 15 * 60 * 1000).toISOString(),
        duration: 15,
        status: 'RESOLVED',
        severity: 'LOW',
        description: 'Brief connection timeout during maintenance window'
      }
    ];
  }

  applyFilters() {
    this.filteredIncidents = this.incidents.filter(incident => {
      const matchesStatus = !this.statusFilter || incident.status === this.statusFilter;
      const matchesSeverity = !this.severityFilter || incident.severity === this.severityFilter;
      const matchesSearch = !this.searchQuery || 
        incident.monitorName.toLowerCase().includes(this.searchQuery.toLowerCase()) ||
        incident.monitorUrl.toLowerCase().includes(this.searchQuery.toLowerCase());
      
      return matchesStatus && matchesSeverity && matchesSearch;
    });
  }

  showOngoingOnly() {
    this.statusFilter = 'ONGOING';
    this.applyFilters();
  }

  clearFilters() {
    this.statusFilter = '';
    this.severityFilter = '';
    this.searchQuery = '';
    this.applyFilters();
  }

  hasFilters(): boolean {
    return !!(this.statusFilter || this.severityFilter || this.searchQuery);
  }

  refreshIncidents() {
    this.loadMockIncidents();
    this.applyFilters();
  }

  // Statistics methods
  getOngoingCount(): number {
    return this.incidents.filter(i => i.status === 'ONGOING').length;
  }

  getResolvedTodayCount(): number {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    return this.incidents.filter(i => 
      i.status === 'RESOLVED' && 
      i.endTime && 
      new Date(i.endTime) >= today
    ).length;
  }

  getOngoingIncidents(): Incident[] {
    return this.incidents.filter(i => i.status === 'ONGOING');
  }

  getTotalIncidents(): number {
    return this.incidents.length;
  }

  getAverageResolutionTime(): string {
    const resolved = this.incidents.filter(i => i.status === 'RESOLVED');
    if (resolved.length === 0) return '0m';
    
    const avgMinutes = resolved.reduce((sum, i) => sum + i.duration, 0) / resolved.length;
    return this.formatDuration(avgMinutes);
  }

  getMTTR(): string {
    // Mean Time To Recovery for this month
    const thisMonth = new Date();
    thisMonth.setDate(1);
    thisMonth.setHours(0, 0, 0, 0);
    
    const thisMonthIncidents = this.incidents.filter(i => 
      i.status === 'RESOLVED' && 
      i.endTime && 
      new Date(i.endTime) >= thisMonth
    );
    
    if (thisMonthIncidents.length === 0) return '0m';
    
    const avgMinutes = thisMonthIncidents.reduce((sum, i) => sum + i.duration, 0) / thisMonthIncidents.length;
    return this.formatDuration(avgMinutes);
  }

  getIncidentRate(): number {
    // Incident rate as percentage of total monitoring time
    // This is a simplified calculation
    const totalMonitoringHours = 24 * 30; // 30 days
    const totalIncidentHours = this.incidents.reduce((sum, i) => sum + (i.duration / 60), 0);
    return Number(((totalIncidentHours / totalMonitoringHours) * 100).toFixed(2));
  }

  // Utility methods
  getStatusColor(status: string): 'primary' | 'warn' | 'accent' {
    switch (status) {
      case 'ONGOING': return 'warn';
      case 'RESOLVED': return 'primary';
      default: return 'accent';
    }
  }

  getSeverityColor(severity: string): 'primary' | 'warn' | 'accent' {
    switch (severity) {
      case 'CRITICAL': return 'warn';
      case 'HIGH': return 'warn';
      case 'MEDIUM': return 'accent';
      case 'LOW': return 'primary';
      default: return 'primary';
    }
  }

  formatDuration(minutes: number): string {
    if (minutes < 60) {
      return `${Math.round(minutes)}m`;
    }
    
    const hours = Math.floor(minutes / 60);
    const remainingMinutes = Math.round(minutes % 60);
    
    if (hours < 24) {
      return remainingMinutes > 0 ? `${hours}h ${remainingMinutes}m` : `${hours}h`;
    }
    
    const days = Math.floor(hours / 24);
    const remainingHours = hours % 24;
    return remainingHours > 0 ? `${days}d ${remainingHours}h` : `${days}d`;
  }

  formatDate(dateString: string): string {
    const date = new Date(dateString);
    return date.toLocaleString();
  }

  getDurationBarWidth(duration: number): number {
    const maxDuration = Math.max(...this.incidents.map(i => i.duration));
    return maxDuration > 0 ? (duration / maxDuration) * 100 : 0;
  }
}