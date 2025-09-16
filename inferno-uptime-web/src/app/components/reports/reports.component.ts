import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatSelectModule } from '@angular/material/select';
import { MatInputModule } from '@angular/material/input';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MatNativeDateModule } from '@angular/material/core';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatChipsModule } from '@angular/material/chips';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { BaseChartDirective } from 'ng2-charts';
import { Chart, ChartConfiguration } from 'chart.js';

@Component({
  selector: 'app-reports',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    MatCardModule,
    MatButtonModule,
    MatIconModule,
    MatFormFieldModule,
    MatSelectModule,
    MatInputModule,
    MatDatepickerModule,
    MatNativeDateModule,
    MatCheckboxModule,
    MatChipsModule,
    MatProgressBarModule,
    BaseChartDirective
  ],
  template: `
    <div class="reports-container">
      <!-- Header -->
      <div class="reports-header">
        <div class="header-content">
          <h1>📊 Reports & Analytics</h1>
          <p class="subtitle">Generate detailed uptime and performance reports</p>
        </div>
      </div>

      <!-- Report Generation -->
      <mat-card class="report-generator">
        <mat-card-header>
          <mat-card-title>Generate Report</mat-card-title>
        </mat-card-header>
        <mat-card-content>
          <div class="generator-form">
            <div class="form-row">
              <mat-form-field appearance="outline">
                <mat-label>Report Type</mat-label>
                <mat-select [(ngModel)]="selectedReportType">
                  <mat-option value="uptime">Uptime Summary</mat-option>
                  <mat-option value="performance">Performance Report</mat-option>
                  <mat-option value="incidents">Incident Report</mat-option>
                  <mat-option value="sla">SLA Report</mat-option>
                </mat-select>
              </mat-form-field>

              <mat-form-field appearance="outline">
                <mat-label>Time Period</mat-label>
                <mat-select [(ngModel)]="selectedPeriod" (selectionChange)="updateDateRange()">
                  <mat-option value="7d">Last 7 Days</mat-option>
                  <mat-option value="30d">Last 30 Days</mat-option>
                  <mat-option value="90d">Last 90 Days</mat-option>
                  <mat-option value="custom">Custom Range</mat-option>
                </mat-select>
              </mat-form-field>

              <mat-form-field appearance="outline" *ngIf="selectedPeriod === 'custom'">
                <mat-label>Start Date</mat-label>
                <input matInput [matDatepicker]="startPicker" [(ngModel)]="startDate">
                <mat-datepicker-toggle matSuffix [for]="startPicker"></mat-datepicker-toggle>
                <mat-datepicker #startPicker></mat-datepicker>
              </mat-form-field>

              <mat-form-field appearance="outline" *ngIf="selectedPeriod === 'custom'">
                <mat-label>End Date</mat-label>
                <input matInput [matDatepicker]="endPicker" [(ngModel)]="endDate">
                <mat-datepicker-toggle matSuffix [for]="endPicker"></mat-datepicker-toggle>
                <mat-datepicker #endPicker></mat-datepicker>
              </mat-form-field>
            </div>

            <div class="form-row">
              <mat-form-field appearance="outline" class="monitors-field">
                <mat-label>Select Monitors</mat-label>
                <mat-select [(ngModel)]="selectedMonitors" multiple>
                  <mat-option value="all">All Monitors</mat-option>
                  <mat-option value="1">Main Website</mat-option>
                  <mat-option value="2">API Endpoint</mat-option>
                  <mat-option value="3">CDN Status</mat-option>
                  <mat-option value="4">Database</mat-option>
                </mat-select>
              </mat-form-field>

              <mat-form-field appearance="outline">
                <mat-label>Format</mat-label>
                <mat-select [(ngModel)]="selectedFormat">
                  <mat-option value="pdf">PDF</mat-option>
                  <mat-option value="csv">CSV</mat-option>
                  <mat-option value="json">JSON</mat-option>
                </mat-select>
              </mat-form-field>
            </div>

            <div class="form-actions">
              <button mat-raised-button color="primary" (click)="generateReport()" [disabled]="generating">
                <mat-icon *ngIf="!generating">description</mat-icon>
                <mat-icon *ngIf="generating" class="spinning">hourglass_empty</mat-icon>
                {{ generating ? 'Generating...' : 'Generate Report' }}
              </button>
              
              <button mat-button (click)="previewReport()" [disabled]="generating">
                <mat-icon>visibility</mat-icon>
                Preview
              </button>
            </div>
          </div>
        </mat-card-content>
      </mat-card>

      <!-- Quick Stats Overview -->
      <div class="overview-stats">
        <mat-card class="overview-card uptime">
          <mat-card-content>
            <div class="stat-content">
              <mat-icon class="stat-icon">trending_up</mat-icon>
              <div class="stat-details">
                <span class="stat-value">99.87%</span>
                <span class="stat-label">Overall Uptime (30d)</span>
              </div>
            </div>
            <mat-progress-bar mode="determinate" value="99.87" class="uptime-bar"></mat-progress-bar>
          </mat-card-content>
        </mat-card>

        <mat-card class="overview-card response">
          <mat-card-content>
            <div class="stat-content">
              <mat-icon class="stat-icon">speed</mat-icon>
              <div class="stat-details">
                <span class="stat-value">142ms</span>
                <span class="stat-label">Avg Response Time</span>
              </div>
            </div>
            <div class="trend-indicator positive">
              <mat-icon>trending_up</mat-icon>
              <span>12% faster</span>
            </div>
          </mat-card-content>
        </mat-card>

        <mat-card class="overview-card incidents">
          <mat-card-content>
            <div class="stat-content">
              <mat-icon class="stat-icon">warning</mat-icon>
              <div class="stat-details">
                <span class="stat-value">3</span>
                <span class="stat-label">Incidents (30d)</span>
              </div>
            </div>
            <div class="trend-indicator negative">
              <mat-icon>trending_down</mat-icon>
              <span>2 more than last month</span>
            </div>
          </mat-card-content>
        </mat-card>

        <mat-card class="overview-card checks">
          <mat-card-content>
            <div class="stat-content">
              <mat-icon class="stat-icon">fact_check</mat-icon>
              <div class="stat-details">
                <span class="stat-value">86,400</span>
                <span class="stat-label">Total Checks</span>
              </div>
            </div>
            <div class="check-breakdown">
              <span class="success">98.2% successful</span>
            </div>
          </mat-card-content>
        </mat-card>
      </div>

      <!-- Charts Section -->
      <div class="charts-section">
        <!-- Uptime Trend Chart -->
        <mat-card class="chart-card">
          <mat-card-header>
            <mat-card-title>Uptime Trend (Last 30 Days)</mat-card-title>
          </mat-card-header>
          <mat-card-content>
            <div class="chart-container">
              <canvas baseChart
                      [data]="uptimeChartData"
                      [options]="uptimeChartOptions"
                      [type]="'line'">
              </canvas>
            </div>
          </mat-card-content>
        </mat-card>

        <!-- Response Time Distribution -->
        <mat-card class="chart-card">
          <mat-card-header>
            <mat-card-title>Response Time Distribution</mat-card-title>
          </mat-card-header>
          <mat-card-content>
            <div class="chart-container">
              <canvas baseChart
                      [data]="responseDistributionData"
                      [options]="responseDistributionOptions"
                      [type]="'bar'">
              </canvas>
            </div>
          </mat-card-content>
        </mat-card>
      </div>

      <!-- Recent Reports -->
      <mat-card class="recent-reports">
        <mat-card-header>
          <mat-card-title>Recent Reports</mat-card-title>
        </mat-card-header>
        <mat-card-content>
          <div class="reports-list">
            <div class="report-item" *ngFor="let report of recentReports">
              <div class="report-info">
                <div class="report-name">{{ report.name }}</div>
                <div class="report-meta">
                  {{ report.type }} • {{ report.period }} • Generated {{ report.generated }}
                </div>
              </div>
              <div class="report-actions">
                <button mat-icon-button (click)="downloadReport(report)" title="Download">
                  <mat-icon>download</mat-icon>
                </button>
                <button mat-icon-button (click)="shareReport(report)" title="Share">
                  <mat-icon>share</mat-icon>
                </button>
                <button mat-icon-button (click)="deleteReport(report)" title="Delete">
                  <mat-icon>delete</mat-icon>
                </button>
              </div>
            </div>
          </div>

          <div class="empty-state" *ngIf="recentReports.length === 0">
            <mat-icon>description</mat-icon>
            <p>No reports generated yet</p>
            <small>Generate your first report to see it here</small>
          </div>
        </mat-card-content>
      </mat-card>

      <!-- SLA Dashboard -->
      <mat-card class="sla-dashboard">
        <mat-card-header>
          <mat-card-title>SLA Dashboard</mat-card-title>
        </mat-card-header>
        <mat-card-content>
          <div class="sla-grid">
            <div class="sla-item" *ngFor="let sla of slaTargets">
              <div class="sla-header">
                <span class="sla-name">{{ sla.name }}</span>
                <mat-chip [color]="getSlaStatus(sla.current, sla.target)" selected>
                  {{ sla.current | number:'1.2-2' }}%
                </mat-chip>
              </div>
              <div class="sla-progress">
                <mat-progress-bar 
                  mode="determinate" 
                  [value]="sla.current"
                  [color]="getSlaProgressColor(sla.current, sla.target)">
                </mat-progress-bar>
                <span class="sla-target">Target: {{ sla.target }}%</span>
              </div>
            </div>
          </div>
        </mat-card-content>
      </mat-card>
    </div>
  `,
  styleUrls: ['./reports.component.scss']
})
export class ReportsComponent implements OnInit {
  selectedReportType = 'uptime';
  selectedPeriod = '30d';
  selectedMonitors: string[] = ['all'];
  selectedFormat = 'pdf';
  startDate: Date | null = null;
  endDate: Date | null = null;
  generating = false;

  recentReports = [
    {
      id: 1,
      name: 'Monthly Uptime Report - December 2024',
      type: 'Uptime Summary',
      period: 'Last 30 days',
      generated: '2 hours ago',
      format: 'PDF'
    },
    {
      id: 2,
      name: 'Performance Analysis - Q4 2024',
      type: 'Performance Report',
      period: 'Last 90 days',
      generated: '1 day ago',
      format: 'CSV'
    }
  ];

  slaTargets = [
    { name: 'Critical Services', current: 99.87, target: 99.9 },
    { name: 'Standard Services', current: 99.45, target: 99.5 },
    { name: 'Development APIs', current: 98.32, target: 99.0 }
  ];

  // Chart data
  uptimeChartData: ChartConfiguration['data'] = {
    labels: this.generateDateLabels(30),
    datasets: [{
      label: 'Uptime %',
      data: this.generateUptimeData(30),
      borderColor: '#4caf50',
      backgroundColor: 'rgba(76, 175, 80, 0.1)',
      tension: 0.4,
      fill: true
    }]
  };

  uptimeChartOptions: ChartConfiguration['options'] = {
    responsive: true,
    maintainAspectRatio: false,
    scales: {
      y: {
        min: 95,
        max: 100,
        title: {
          display: true,
          text: 'Uptime (%)'
        }
      }
    },
    plugins: {
      legend: {
        display: false
      }
    }
  };

  responseDistributionData: ChartConfiguration['data'] = {
    labels: ['0-100ms', '100-200ms', '200-500ms', '500ms-1s', '1s+'],
    datasets: [{
      label: 'Requests',
      data: [45, 30, 15, 8, 2],
      backgroundColor: [
        '#4caf50',
        '#8bc34a',
        '#ffeb3b',
        '#ff9800',
        '#f44336'
      ]
    }]
  };

  responseDistributionOptions: ChartConfiguration['options'] = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        display: false
      }
    }
  };

  constructor() {}

  ngOnInit() {
    this.updateDateRange();
  }

  updateDateRange() {
    const now = new Date();
    this.endDate = now;
    
    switch (this.selectedPeriod) {
      case '7d':
        this.startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        break;
      case '30d':
        this.startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
        break;
      case '90d':
        this.startDate = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);
        break;
      case 'custom':
        // Keep existing dates or set defaults
        if (!this.startDate) {
          this.startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
        }
        break;
    }
  }

  generateReport() {
    this.generating = true;
    
    // Simulate report generation
    setTimeout(() => {
      this.generating = false;
      
      // Add to recent reports
      const newReport = {
        id: Date.now(),
        name: `${this.getReportTypeName()} - ${new Date().toLocaleDateString()}`,
        type: this.getReportTypeName(),
        period: this.getPeriodLabel(),
        generated: 'Just now',
        format: this.selectedFormat.toUpperCase()
      };
      
      this.recentReports.unshift(newReport);
      
      // Simulate download
      this.downloadReport(newReport);
    }, 3000);
  }

  previewReport() {
    // Open preview dialog or navigate to preview page
    console.log('Preview report:', {
      type: this.selectedReportType,
      period: this.selectedPeriod,
      monitors: this.selectedMonitors
    });
  }

  downloadReport(report: any) {
    // Simulate file download
    const blob = new Blob(['Mock report content'], { type: 'text/plain' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${report.name}.${report.format.toLowerCase()}`;
    a.click();
    window.URL.revokeObjectURL(url);
  }

  shareReport(report: any) {
    // Copy share link or open share dialog
    navigator.clipboard.writeText(`Report: ${report.name}`);
  }

  deleteReport(report: any) {
    if (confirm(`Delete report "${report.name}"?`)) {
      this.recentReports = this.recentReports.filter(r => r.id !== report.id);
    }
  }

  getSlaStatus(current: number, target: number): 'primary' | 'warn' | 'accent' {
    if (current >= target) return 'primary';
    if (current >= target - 0.5) return 'accent';
    return 'warn';
  }

  getSlaProgressColor(current: number, target: number): 'primary' | 'warn' | 'accent' {
    return this.getSlaStatus(current, target);
  }

  private getReportTypeName(): string {
    switch (this.selectedReportType) {
      case 'uptime': return 'Uptime Summary';
      case 'performance': return 'Performance Report';
      case 'incidents': return 'Incident Report';
      case 'sla': return 'SLA Report';
      default: return 'Report';
    }
  }

  private getPeriodLabel(): string {
    switch (this.selectedPeriod) {
      case '7d': return 'Last 7 days';
      case '30d': return 'Last 30 days';
      case '90d': return 'Last 90 days';
      case 'custom': return 'Custom range';
      default: return 'Unknown period';
    }
  }

  private generateDateLabels(days: number): string[] {
    const labels = [];
    for (let i = days - 1; i >= 0; i--) {
      const date = new Date();
      date.setDate(date.getDate() - i);
      labels.push(date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }));
    }
    return labels;
  }

  private generateUptimeData(days: number): number[] {
    const data = [];
    for (let i = 0; i < days; i++) {
      // Generate realistic uptime data between 99-100%
      data.push(99.5 + Math.random() * 0.5);
    }
    return data;
  }
}