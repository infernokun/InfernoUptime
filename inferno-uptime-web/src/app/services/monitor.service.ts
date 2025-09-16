import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable, BehaviorSubject } from 'rxjs';
import { tap } from 'rxjs/operators';
import { EnvironmentService } from './environment.service';

export interface Monitor {
  id: number;
  name: string;
  url: string;
  type: 'HTTP' | 'HTTPS' | 'TCP' | 'PING' | 'DNS';
  currentStatus: 'UP' | 'DOWN' | 'PENDING' | 'MAINTENANCE';
  checkInterval: number;
  timeoutSeconds: number;
  maxRedirects: number;
  description?: string;
  expectedStatusCodes: string;
  keywordCheck?: string;
  customHeaders?: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  lastChecked?: string;
  lastResponseTime?: number;
  lastStatusCode?: number;
  lastCheckMessage?: string;
  uptimePercentage?: number;
  statusDisplay?: string;
}

export interface MonitorCreateRequest {
  name: string;
  url: string;
  type: 'HTTP' | 'HTTPS' | 'TCP' | 'PING' | 'DNS';
  checkInterval?: number;
  timeoutSeconds?: number;
  maxRedirects?: number;
  description?: string;
  expectedStatusCodes?: string;
  keywordCheck?: string;
  customHeaders?: string;
  isActive?: boolean;
}

export interface MonitorStats {
  monitorId: number;
  monitorName: string;
  totalChecks: number;
  successfulChecks: number;
  uptime: number;
  averageResponseTime: number;
  period: number;
  periodStart: string;
  periodEnd: string;
  totalDowntime: number;
  uptimeData?: UptimeDataPoint[];
}

export interface UptimeDataPoint {
  timestamp: string;
  isUp: boolean;
  responseTime: number;
  statusCode?: number;
  message?: string;
}

export interface MonitorCheck {
  id: number;
  timestamp: string;
  responseTime: number;
  statusCode?: number;
  isUp: boolean;
  message: string;
  errorDetails?: string;
}

export interface MonitorTestRequest {
  url: string;
  type: 'HTTP' | 'HTTPS' | 'TCP' | 'PING' | 'DNS';
  timeoutSeconds?: number;
  expectedStatusCodes?: string;
  keywordCheck?: string;
  customHeaders?: string;
}

export interface MonitorTestResult {
  success: boolean;
  responseTime: number;
  statusCode?: number;
  message: string;
  errorDetails?: string;
  timestamp: string;
  contentLength?: number;
  contentType?: string;
  keywordFound?: boolean;
  redirectCount?: number;
  finalUrl?: string;
}

export interface ApiResponse<T> {
  success: boolean;
  message: string;
  data: T;
  timestamp: string;
  error?: string;
}

export interface PagedResponse<T> {
  content: T[];
  page: number;
  size: number;
  totalElements: number;
  totalPages: number;
  first: boolean;
  last: boolean;
  hasNext: boolean;
  hasPrevious: boolean;
}

@Injectable({
  providedIn: 'root'
})
export class MonitorService {
  private baseUrl;
  private monitorsSubject = new BehaviorSubject<Monitor[]>([]);
  
  constructor(private http: HttpClient, private environmentService: EnvironmentService) {
    this.baseUrl = `${this.environmentService.settings?.restUrl}/v1/monitors`
    this.loadMonitors();
  }

  // CRUD Operations
  createMonitor(request: MonitorCreateRequest): Observable<ApiResponse<Monitor>> {
    return this.http.post<ApiResponse<Monitor>>(this.baseUrl, request)
      .pipe(tap(() => this.loadMonitors()));
  }

  getAllMonitors(page: number = 0, size: number = 20, search?: string, status?: string): Observable<ApiResponse<PagedResponse<Monitor>>> {
    let params = new HttpParams()
      .set('page', page.toString())
      .set('size', size.toString());
    
    if (search) {
      params = params.set('search', search);
    }
    
    if (status) {
      params = params.set('status', status);
    }
    
    return this.http.get<ApiResponse<PagedResponse<Monitor>>>(this.baseUrl, { params });
  }

  getActiveMonitors(): Observable<ApiResponse<Monitor[]>> {
    return this.http.get<ApiResponse<Monitor[]>>(`${this.baseUrl}/active`);
  }

  getMonitor(id: number): Observable<ApiResponse<Monitor>> {
    return this.http.get<ApiResponse<Monitor>>(`${this.baseUrl}/${id}`);
  }

  updateMonitor(id: number, request: Partial<MonitorCreateRequest>): Observable<ApiResponse<Monitor>> {
    return this.http.put<ApiResponse<Monitor>>(`${this.baseUrl}/${id}`, request)
      .pipe(tap(() => this.loadMonitors()));
  }

  deleteMonitor(id: number): Observable<ApiResponse<void>> {
    return this.http.delete<ApiResponse<void>>(`${this.baseUrl}/${id}`)
      .pipe(tap(() => this.loadMonitors()));
  }

  toggleMonitorStatus(id: number): Observable<ApiResponse<void>> {
    return this.http.post<ApiResponse<void>>(`${this.baseUrl}/${id}/toggle`, {})
      .pipe(tap(() => this.loadMonitors()));
  }

  // Statistics and Analytics
  getMonitorStats(id: number, days: number = 30): Observable<ApiResponse<MonitorStats>> {
    const params = new HttpParams().set('days', days.toString());
    return this.http.get<ApiResponse<MonitorStats>>(`${this.baseUrl}/${id}/stats`, { params });
  }

  getMonitorChecks(id: number, limit: number = 100): Observable<ApiResponse<MonitorCheck[]>> {
    const params = new HttpParams().set('limit', limit.toString());
    return this.http.get<ApiResponse<MonitorCheck[]>>(`${this.baseUrl}/${id}/checks`, { params });
  }

  // Manual Operations
  runManualCheck(id: number): Observable<ApiResponse<string>> {
    return this.http.post<ApiResponse<string>>(`${this.baseUrl}/${id}/check`, {});
  }

  testMonitorConfiguration(request: MonitorTestRequest): Observable<ApiResponse<MonitorTestResult>> {
    return this.http.post<ApiResponse<MonitorTestResult>>(`${this.baseUrl}/test`, request);
  }

  // Dashboard
  getDashboardSummary(): Observable<ApiResponse<any>> {
    return this.http.get<ApiResponse<any>>(`${this.baseUrl}/dashboard/summary`);
  }

  // Local state management
  private loadMonitors() {
    this.getActiveMonitors().subscribe({
      next: (response) => {
        if (response.success) {
          this.monitorsSubject.next(response.data);
        }
      },
      error: (error) => {
        console.error('Error loading monitors:', error);
      }
    });
  }

  getMonitorsObservable(): Observable<Monitor[]> {
    return this.monitorsSubject.asObservable();
  }

  refreshMonitors() {
    this.loadMonitors();
  }

  // Utility methods
  getStatusColor(status: string): string {
    switch (status) {
      case 'UP': return '#4caf50';
      case 'DOWN': return '#f44336';
      case 'PENDING': return '#ff9800';
      case 'MAINTENANCE': return '#9e9e9e';
      default: return '#757575';
    }
  }

  getStatusIcon(status: string): string {
    switch (status) {
      case 'UP': return 'check_circle';
      case 'DOWN': return 'error';
      case 'PENDING': return 'schedule';
      case 'MAINTENANCE': return 'build';
      default: return 'help';
    }
  }

  formatResponseTime(ms: number): string {
    if (ms < 1000) {
      return `${ms}ms`;
    }
    return `${(ms / 1000).toFixed(2)}s`;
  }

  calculateUptime(successfulChecks: number, totalChecks: number): number {
    if (totalChecks === 0) return 0;
    return (successfulChecks / totalChecks) * 100;
  }
}