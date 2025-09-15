import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatTableModule } from '@angular/material/table';
import { MatPaginatorModule, PageEvent } from '@angular/material/paginator';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatChipsModule } from '@angular/material/chips';
import { MatDialogModule, MatDialog } from '@angular/material/dialog';
import { MatSlideToggleModule } from '@angular/material/slide-toggle';
import { MatMenuModule } from '@angular/material/menu';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSnackBarModule } from '@angular/material/snack-bar';
import { Subject, Subscription } from 'rxjs';
import { debounceTime, distinctUntilChanged } from 'rxjs/operators';
import { Monitor, MonitorService, MonitorCreateRequest } from '../../services/monitor.service';
import { NotificationService } from '../../services/notification.service';
import { WebSocketService, MonitorUpdate } from '../../services/websocket.service';
import { AddMonitorDialogComponent } from '../common/dialog/add-monitor-dialog/add-monitor-dialog.component';
import { MaterialModule } from '../../material.module';

@Component({
  selector: 'app-monitors',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    ReactiveFormsModule,
    MaterialModule
  ],
  template: `
    <div class="monitors-container">
      <!-- Header -->
      <div class="monitors-header">
        <div class="header-content">
          <h1>Monitors</h1>
          <p class="subtitle">Manage your uptime monitors</p>
        </div>
        <button mat-raised-button color="primary" (click)="openAddMonitorDialog()">
          <mat-icon>add</mat-icon>
          Add Monitor
        </button>
      </div>

      <!-- Filters and Search -->
      <mat-card class="filters-card">
        <mat-card-content>
          <div class="filters-row">
            <mat-form-field appearance="outline" class="search-field">
              <mat-label>Search monitors</mat-label>
              <input matInput 
                     [(ngModel)]="searchQuery" 
                     (keyup)="onSearchChange()"
                     placeholder="Search by name or URL">
              <mat-icon matSuffix>search</mat-icon>
            </mat-form-field>

            <mat-form-field appearance="outline">
              <mat-label>Filter by status</mat-label>
              <mat-select [(ngModel)]="statusFilter" (selectionChange)="loadMonitors()">
                <mat-option value="">All Statuses</mat-option>
                <mat-option value="UP">Up</mat-option>
                <mat-option value="DOWN">Down</mat-option>
                <mat-option value="PENDING">Pending</mat-option>
                <mat-option value="MAINTENANCE">Maintenance</mat-option>
              </mat-select>
            </mat-form-field>

            <button mat-icon-button (click)="loadMonitors()" [disabled]="loading">
              <mat-icon>refresh</mat-icon>
            </button>
          </div>
        </mat-card-content>
      </mat-card>

      <!-- Monitors Table -->
      <mat-card class="table-card">
        <mat-card-content>
          <div class="table-container">
            <table mat-table [dataSource]="monitors" class="monitors-table">
              <!-- Status Column -->
              <ng-container matColumnDef="status">
                <th mat-header-cell *matHeaderCellDef>Status</th>
                <td mat-cell *matCellDef="let monitor">
                  <div class="status-cell">
                    <div class="status-indicator" 
                         [style.background-color]="getStatusColor(monitor.currentStatus)">
                    </div>
                    <mat-icon [style.color]="getStatusColor(monitor.currentStatus)">
                      {{ getStatusIcon(monitor.currentStatus) }}
                    </mat-icon>
                  </div>
                </td>
              </ng-container>

              <!-- Name Column -->
              <ng-container matColumnDef="name">
                <th mat-header-cell *matHeaderCellDef>Name</th>
                <td mat-cell *matCellDef="let monitor">
                  <div class="name-cell">
                    <div class="monitor-name">{{ monitor.name }}</div>
                    <div class="monitor-type">{{ monitor.type }}</div>
                  </div>
                </td>
              </ng-container>

              <!-- URL Column -->
              <ng-container matColumnDef="url">
                <th mat-header-cell *matHeaderCellDef>URL</th>
                <td mat-cell *matCellDef="let monitor">
                  <div class="url-cell">
                    <a [href]="monitor.url" target="_blank" class="monitor-url">
                      {{ monitor.url }}
                    </a>
                  </div>
                </td>
              </ng-container>

              <!-- Response Time Column -->
              <ng-container matColumnDef="responseTime">
                <th mat-header-cell *matHeaderCellDef>Response Time</th>
                <td mat-cell *matCellDef="let monitor">
                  <div class="response-time-cell" 
                       [class.fast]="monitor.lastResponseTime && monitor.lastResponseTime < 500"
                       [class.slow]="monitor.lastResponseTime && monitor.lastResponseTime > 2000">
                    {{ monitor.lastResponseTime ? formatResponseTime(monitor.lastResponseTime) : 'N/A' }}
                  </div>
                </td>
              </ng-container>

              <!-- Uptime Column -->
              <ng-container matColumnDef="uptime">
                <th mat-header-cell *matHeaderCellDef>Uptime</th>
                <td mat-cell *matCellDef="let monitor">
                  <div class="uptime-cell">
                    <span class="uptime-percentage" 
                          [class.good]="monitor.uptimePercentage && monitor.uptimePercentage >= 99"
                          [class.warning]="monitor.uptimePercentage && monitor.uptimePercentage >= 95 && monitor.uptimePercentage < 99"
                          [class.poor]="monitor.uptimePercentage && monitor.uptimePercentage < 95">
                      {{ monitor.uptimePercentage ? (monitor.uptimePercentage | number:'1.2-2') + '%' : 'N/A' }}
                    </span>
                  </div>
                </td>
              </ng-container>

              <!-- Last Check Column -->
              <ng-container matColumnDef="lastCheck">
                <th mat-header-cell *matHeaderCellDef>Last Check</th>
                <td mat-cell *matCellDef="let monitor">
                  <div class="last-check-cell">
                    {{ monitor.lastChecked ? formatDate(monitor.lastChecked) : 'Never' }}
                  </div>
                </td>
              </ng-container>

              <!-- Active Column -->
              <ng-container matColumnDef="active">
                <th mat-header-cell *matHeaderCellDef>Active</th>
                <td mat-cell *matCellDef="let monitor">
                  <mat-slide-toggle 
                    [checked]="monitor.isActive"
                    (change)="toggleMonitor(monitor)"
                    [disabled]="loading">
                  </mat-slide-toggle>
                </td>
              </ng-container>

              <!-- Actions Column -->
              <ng-container matColumnDef="actions">
                <th mat-header-cell *matHeaderCellDef>Actions</th>
                <td mat-cell *matCellDef="let monitor">
                  <button mat-icon-button [matMenuTriggerFor]="actionMenu">
                    <mat-icon>more_vert</mat-icon>
                  </button>
                  <mat-menu #actionMenu="matMenu">
                    <button mat-menu-item (click)="viewMonitorDetails(monitor)">
                      <mat-icon>visibility</mat-icon>
                      <span>View Details</span>
                    </button>
                    <button mat-menu-item (click)="editMonitor(monitor)">
                      <mat-icon>edit</mat-icon>
                      <span>Edit</span>
                    </button>
                    <button mat-menu-item (click)="runManualCheck(monitor)">
                      <mat-icon>play_arrow</mat-icon>
                      <span>Run Check</span>
                    </button>
                    <button mat-menu-item (click)="duplicateMonitor(monitor)">
                      <mat-icon>content_copy</mat-icon>
                      <span>Duplicate</span>
                    </button>
                    <mat-divider></mat-divider>
                    <button mat-menu-item (click)="deleteMonitor(monitor)" class="delete-action">
                      <mat-icon>delete</mat-icon>
                      <span>Delete</span>
                    </button>
                  </mat-menu>
                </td>
              </ng-container>

              <tr mat-header-row *matHeaderRowDef="displayedColumns"></tr>
              <tr mat-row *matRowDef="let row; columns: displayedColumns;" 
                  [class.monitor-row]="true"
                  [class.monitor-up]="row.currentStatus === 'UP'"
                  [class.monitor-down]="row.currentStatus === 'DOWN'"
                  [class.monitor-pending]="row.currentStatus === 'PENDING'"
                  [class.monitor-inactive]="!row.isActive">
              </tr>
            </table>
          </div>

          <!-- Loading State -->
          <div class="loading-container" *ngIf="loading">
            <mat-spinner diameter="40"></mat-spinner>
            <p>Loading monitors...</p>
          </div>

          <!-- Empty State -->
          <div class="empty-state" *ngIf="!loading && monitors.length === 0">
            <mat-icon>monitor</mat-icon>
            <h3>No monitors found</h3>
            <p>{{ searchQuery || statusFilter ? 'Try adjusting your filters' : 'Get started by adding your first monitor' }}</p>
            <button mat-raised-button color="primary" (click)="openAddMonitorDialog()" *ngIf="!searchQuery && !statusFilter">
              <mat-icon>add</mat-icon>
              Add Your First Monitor
            </button>
          </div>

          <!-- Pagination -->
          <mat-paginator 
            [length]="totalElements"
            [pageSize]="pageSize"
            [pageIndex]="currentPage"
            [pageSizeOptions]="[10, 20, 50, 100]"
            (page)="onPageChange($event)"
            *ngIf="!loading && monitors.length > 0">
          </mat-paginator>
        </mat-card-content>
      </mat-card>
    </div>
  `,
  styleUrls: ['./monitors.component.scss']
})
export class MonitorsComponent implements OnInit, OnDestroy {
  monitors: Monitor[] = [];
  loading = false;
  
  // Pagination
  currentPage = 0;
  pageSize = 20;
  totalElements = 0;
  
  // Filters
  searchQuery = '';
  statusFilter = '';
  
  // Table
  displayedColumns = ['status', 'name', 'url', 'responseTime', 'uptime', 'lastCheck', 'active', 'actions'];
  
  private subscriptions: Subscription[] = [];
  private searchSubject = new Subject<string>();

  constructor(
    private monitorService: MonitorService,
    private webSocketService: WebSocketService,
    private notificationService: NotificationService,
    private dialog: MatDialog
  ) {
    // Setup search debouncing
    this.searchSubject.pipe(
      debounceTime(300),
      distinctUntilChanged()
    ).subscribe(() => {
      this.currentPage = 0;
      this.loadMonitors();
    });
  }

  ngOnInit() {
    this.loadMonitors();
    this.subscribeToRealTimeUpdates();
  }

  ngOnDestroy() {
    this.subscriptions.forEach(sub => sub.unsubscribe());
  }

  loadMonitors() {
    this.loading = true;
    
    this.monitorService.getAllMonitors(
      this.currentPage, 
      this.pageSize, 
      this.searchQuery || undefined, 
      this.statusFilter || undefined
    ).subscribe({
      next: (response) => {
        if (response.success) {
          this.monitors = response.data.content;
          this.totalElements = response.data.totalElements;
        }
        this.loading = false;
      },
      error: (error) => {
        this.notificationService.showError('Failed to load monitors');
        console.error('Error loading monitors:', error);
        this.loading = false;
      }
    });
  }

  private subscribeToRealTimeUpdates() {
    const monitorUpdateSub = this.webSocketService.subscribeToMonitors().subscribe(
      (update: MonitorUpdate) => {
        this.updateMonitorInList(update);
      }
    );

    this.subscriptions.push(monitorUpdateSub);
  }

  private updateMonitorInList(update: MonitorUpdate) {
    const index = this.monitors.findIndex(m => m.id === update.monitorId);
    if (index !== -1) {
      this.monitors[index].currentStatus = update.isUp ? 'UP' : 'DOWN';
      this.monitors[index].lastResponseTime = update.responseTime;
      this.monitors[index].lastStatusCode = update.statusCode;
      this.monitors[index].lastChecked = update.timestamp;
    }
  }

  onSearchChange() {
    this.searchSubject.next(this.searchQuery);
  }

  onPageChange(event: PageEvent) {
    this.currentPage = event.pageIndex;
    this.pageSize = event.pageSize;
    this.loadMonitors();
  }

  openAddMonitorDialog() {
    const dialogRef = this.dialog.open(AddMonitorDialogComponent, {
      width: '600px',
      data: {}
    });

    dialogRef.afterClosed().subscribe(result => {
      if (result) {
        this.loadMonitors();
      }
    });
  }

  editMonitor(monitor: Monitor) {
    const dialogRef = this.dialog.open(AddMonitorDialogComponent, {
      width: '600px',
      data: { monitor }
    });

    dialogRef.afterClosed().subscribe(result => {
      if (result) {
        this.loadMonitors();
      }
    });
  }

  toggleMonitor(monitor: Monitor) {
    this.monitorService.toggleMonitorStatus(monitor.id).subscribe({
      next: (response) => {
        if (response.success) {
          monitor.isActive = !monitor.isActive;
          this.notificationService.showSuccess(
            `Monitor ${monitor.isActive ? 'activated' : 'deactivated'}`
          );
        }
      },
      error: (error) => {
        this.notificationService.showError('Failed to update monitor status');
        console.error('Error toggling monitor:', error);
      }
    });
  }

  runManualCheck(monitor: Monitor) {
    this.notificationService.showInfo(`Running check for ${monitor.name}...`);
    
    this.monitorService.runManualCheck(monitor.id).subscribe({
      next: (response) => {
        if (response.success) {
          this.notificationService.showSuccess('Check initiated successfully');
        }
      },
      error: (error) => {
        this.notificationService.showError('Failed to run check');
        console.error('Error running check:', error);
      }
    });
  }

  duplicateMonitor(monitor: Monitor) {
    const duplicateData: MonitorCreateRequest = {
      name: `${monitor.name} (Copy)`,
      url: monitor.url,
      type: monitor.type,
      checkInterval: monitor.checkInterval,
      timeoutSeconds: monitor.timeoutSeconds,
      maxRedirects: monitor.maxRedirects,
      description: monitor.description,
      expectedStatusCodes: monitor.expectedStatusCodes,
      keywordCheck: monitor.keywordCheck,
      customHeaders: monitor.customHeaders,
      isActive: false // Start inactive
    };

    const dialogRef = this.dialog.open(AddMonitorDialogComponent, {
      width: '600px',
      data: { monitorData: duplicateData }
    });

    dialogRef.afterClosed().subscribe(result => {
      if (result) {
        this.loadMonitors();
      }
    });
  }

  viewMonitorDetails(monitor: Monitor) {
    // Navigate to monitor details page
    console.log('View details for monitor:', monitor);
  }

  deleteMonitor(monitor: Monitor) {
    if (confirm(`Are you sure you want to delete "${monitor.name}"?`)) {
      this.monitorService.deleteMonitor(monitor.id).subscribe({
        next: (response) => {
          if (response.success) {
            this.notificationService.showSuccess('Monitor deleted successfully');
            this.loadMonitors();
          }
        },
        error: (error) => {
          this.notificationService.showError('Failed to delete monitor');
          console.error('Error deleting monitor:', error);
        }
      });
    }
  }

  // Utility methods
  getStatusIcon(status: string): string {
    return this.monitorService.getStatusIcon(status);
  }

  getStatusColor(status: string): string {
    return this.monitorService.getStatusColor(status);
  }

  formatResponseTime(ms: number): string {
    return this.monitorService.formatResponseTime(ms);
  }

  formatDate(dateString: string): string {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    
    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    
    const diffHours = Math.floor(diffMins / 60);
    if (diffHours < 24) return `${diffHours}h ago`;
    
    const diffDays = Math.floor(diffHours / 24);
    if (diffDays < 7) return `${diffDays}d ago`;
    
    return date.toLocaleDateString();
  }
}