import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatSlideToggleModule } from '@angular/material/slide-toggle';
import { MatTabsModule } from '@angular/material/tabs';
import { MatChipsModule } from '@angular/material/chips';
import { MatDividerModule } from '@angular/material/divider';
import { MatExpansionModule } from '@angular/material/expansion';
import { NotificationService } from '../../services/notification.service';

@Component({
  selector: 'app-settings',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    ReactiveFormsModule,
    MatCardModule,
    MatButtonModule,
    MatIconModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    MatSlideToggleModule,
    MatTabsModule,
    MatChipsModule,
    MatDividerModule,
    MatExpansionModule
  ],
  template: `
    <div class="settings-container">
      <!-- Header -->
      <div class="settings-header">
        <div class="header-content">
          <h1>⚙️ Settings</h1>
          <p class="subtitle">Configure your Inferno Uptime application</p>
        </div>
      </div>

      <mat-tab-group class="settings-tabs" animationDuration="300ms">
        <!-- General Settings -->
        <mat-tab label="General">
          <div class="tab-content">
            <mat-card>
              <mat-card-header>
                <mat-card-title>Application Settings</mat-card-title>
              </mat-card-header>
              <mat-card-content>
                <form [formGroup]="generalForm" class="settings-form">
                  <div class="form-row">
                    <mat-form-field appearance="outline" class="full-width">
                      <mat-label>Application Name</mat-label>
                      <input matInput formControlName="appName">
                    </mat-form-field>
                  </div>

                  <div class="form-row">
                    <mat-form-field appearance="outline">
                      <mat-label>Default Check Interval</mat-label>
                      <mat-select formControlName="defaultInterval">
                        <mat-option value="30">30 seconds</mat-option>
                        <mat-option value="60">1 minute</mat-option>
                        <mat-option value="300">5 minutes</mat-option>
                        <mat-option value="600">10 minutes</mat-option>
                      </mat-select>
                    </mat-form-field>

                    <mat-form-field appearance="outline">
                      <mat-label>Timezone</mat-label>
                      <mat-select formControlName="timezone">
                        <mat-option value="UTC">UTC</mat-option>
                        <mat-option value="America/New_York">Eastern Time</mat-option>
                        <mat-option value="America/Los_Angeles">Pacific Time</mat-option>
                        <mat-option value="Europe/London">London</mat-option>
                        <mat-option value="Asia/Tokyo">Tokyo</mat-option>
                      </mat-select>
                    </mat-form-field>
                  </div>

                  <div class="form-row">
                    <mat-slide-toggle formControlName="darkMode" color="primary">
                      Dark Mode
                    </mat-slide-toggle>
                  </div>

                  <div class="form-row">
                    <mat-slide-toggle formControlName="autoRefresh" color="primary">
                      Auto-refresh Dashboard
                    </mat-slide-toggle>
                  </div>

                  <div class="form-actions">
                    <button mat-raised-button color="primary" (click)="saveGeneralSettings()">
                      <mat-icon>save</mat-icon>
                      Save Changes
                    </button>
                  </div>
                </form>
              </mat-card-content>
            </mat-card>
          </div>
        </mat-tab>

        <!-- Notifications -->
        <mat-tab label="Notifications">
          <div class="tab-content">
            <mat-card>
              <mat-card-header>
                <mat-card-title>Notification Preferences</mat-card-title>
              </mat-card-header>
              <mat-card-content>
                <form [formGroup]="notificationForm" class="settings-form">
                  <mat-expansion-panel class="notification-panel">
                    <mat-expansion-panel-header>
                      <mat-panel-title>Email Notifications</mat-panel-title>
                      <mat-panel-description>
                        Configure email alerts for monitor events
                      </mat-panel-description>
                    </mat-expansion-panel-header>

                    <div class="panel-content">
                      <div class="form-row">
                        <mat-slide-toggle formControlName="emailEnabled" color="primary">
                          Enable Email Notifications
                        </mat-slide-toggle>
                      </div>

                      <div class="form-row" *ngIf="notificationForm.get('emailEnabled')?.value">
                        <mat-form-field appearance="outline" class="full-width">
                          <mat-label>Email Recipients</mat-label>
                          <input matInput formControlName="emailRecipients" 
                                 placeholder="admin@example.com, team@example.com">
                          <mat-hint>Comma-separated email addresses</mat-hint>
                        </mat-form-field>
                      </div>

                      <div class="checkbox-group" *ngIf="notificationForm.get('emailEnabled')?.value">
                        <label>Send notifications for:</label>
                        <mat-slide-toggle formControlName="emailOnDown">Monitor goes down</mat-slide-toggle>
                        <mat-slide-toggle formControlName="emailOnUp">Monitor comes back up</mat-slide-toggle>
                        <mat-slide-toggle formControlName="emailOnSlow">Slow response times</mat-slide-toggle>
                      </div>
                    </div>
                  </mat-expansion-panel>

                  <mat-expansion-panel class="notification-panel">
                    <mat-expansion-panel-header>
                      <mat-panel-title>Webhook Notifications</mat-panel-title>
                      <mat-panel-description>
                        Send HTTP requests to external services
                      </mat-panel-description>
                    </mat-expansion-panel-header>

                    <div class="panel-content">
                      <div class="form-row">
                        <mat-slide-toggle formControlName="webhookEnabled" color="primary">
                          Enable Webhook Notifications
                        </mat-slide-toggle>
                      </div>

                      <div class="form-row" *ngIf="notificationForm.get('webhookEnabled')?.value">
                        <mat-form-field appearance="outline" class="full-width">
                          <mat-label>Webhook URL</mat-label>
                          <input matInput formControlName="webhookUrl" 
                                 placeholder="https://hooks.slack.com/services/...">
                        </mat-form-field>
                      </div>

                      <div class="checkbox-group" *ngIf="notificationForm.get('webhookEnabled')?.value">
                        <label>Send webhooks for:</label>
                        <mat-slide-toggle formControlName="webhookOnDown">Monitor goes down</mat-slide-toggle>
                        <mat-slide-toggle formControlName="webhookOnUp">Monitor comes back up</mat-slide-toggle>
                        <mat-slide-toggle formControlName="webhookOnSlow">Slow response times</mat-slide-toggle>
                      </div>
                    </div>
                  </mat-expansion-panel>

                  <div class="form-actions">
                    <button mat-raised-button color="primary" (click)="saveNotificationSettings()">
                      <mat-icon>save</mat-icon>
                      Save Notification Settings
                    </button>
                    <button mat-button (click)="testNotifications()">
                      <mat-icon>send</mat-icon>
                      Test Notifications
                    </button>
                  </div>
                </form>
              </mat-card-content>
            </mat-card>
          </div>
        </mat-tab>

        <!-- Data & Privacy -->
        <mat-tab label="Data & Privacy">
          <div class="tab-content">
            <mat-card>
              <mat-card-header>
                <mat-card-title>Data Management</mat-card-title>
              </mat-card-header>
              <mat-card-content>
                <div class="data-settings">
                  <div class="setting-item">
                    <div class="setting-info">
                      <h3>Data Retention</h3>
                      <p>How long to keep monitor check data</p>
                    </div>
                    <mat-form-field appearance="outline">
                      <mat-label>Retention Period</mat-label>
                      <mat-select [(ngModel)]="dataRetention">
                        <mat-option value="30">30 days</mat-option>
                        <mat-option value="90">90 days</mat-option>
                        <mat-option value="180">6 months</mat-option>
                        <mat-option value="365">1 year</mat-option>
                        <mat-option value="0">Keep forever</mat-option>
                      </mat-select>
                    </mat-form-field>
                  </div>

                  <mat-divider></mat-divider>

                  <div class="setting-item">
                    <div class="setting-info">
                      <h3>Export Data</h3>
                      <p>Download all your monitoring data</p>
                    </div>
                    <button mat-raised-button (click)="exportData()">
                      <mat-icon>download</mat-icon>
                      Export All Data
                    </button>
                  </div>

                  <mat-divider></mat-divider>

                  <div class="setting-item danger">
                    <div class="setting-info">
                      <h3>Clear All Data</h3>
                      <p>Permanently delete all monitoring history</p>
                    </div>
                    <button mat-raised-button color="warn" (click)="clearAllData()">
                      <mat-icon>delete_forever</mat-icon>
                      Clear All Data
                    </button>
                  </div>
                </div>
              </mat-card-content>
            </mat-card>
          </div>
        </mat-tab>

        <!-- API & Integrations -->
        <mat-tab label="API & Integrations">
          <div class="tab-content">
            <mat-card>
              <mat-card-header>
                <mat-card-title>API Configuration</mat-card-title>
              </mat-card-header>
              <mat-card-content>
                <div class="api-settings">
                  <div class="setting-item">
                    <div class="setting-info">
                      <h3>API Access</h3>
                      <p>Generate API keys for external integrations</p>
                    </div>
                    <button mat-raised-button color="primary" (click)="generateApiKey()">
                      <mat-icon>vpn_key</mat-icon>
                      Generate New API Key
                    </button>
                  </div>

                  <div class="api-keys" *ngIf="apiKeys.length > 0">
                    <h4>Active API Keys</h4>
                    <div class="key-item" *ngFor="let key of apiKeys">
                      <div class="key-info">
                        <code>{{ key.key }}</code>
                        <small>Created: {{ key.created }}</small>
                      </div>
                      <button mat-icon-button color="warn" (click)="revokeApiKey(key)">
                        <mat-icon>delete</mat-icon>
                      </button>
                    </div>
                  </div>

                  <mat-divider></mat-divider>

                  <div class="setting-item">
                    <div class="setting-info">
                      <h3>Webhook Endpoints</h3>
                      <p>Configure incoming webhooks for external monitoring</p>
                    </div>
                    <button mat-raised-button (click)="addWebhookEndpoint()">
                      <mat-icon>add</mat-icon>
                      Add Webhook Endpoint
                    </button>
                  </div>
                </div>
              </mat-card-content>
            </mat-card>
          </div>
        </mat-tab>

        <!-- About -->
        <mat-tab label="About">
          <div class="tab-content">
            <mat-card>
              <mat-card-header>
                <mat-card-title>About Inferno Uptime</mat-card-title>
              </mat-card-header>
              <mat-card-content>
                <div class="about-content">
                  <div class="app-info">
                    <div class="app-logo">🔥</div>
                    <h2>Inferno Uptime</h2>
                    <p>Advanced uptime monitoring with real-time notifications</p>
                  </div>

                  <div class="version-info">
                    <div class="info-item">
                      <span class="info-label">Version:</span>
                      <span class="info-value">1.0.0</span>
                    </div>
                    <div class="info-item">
                      <span class="info-label">Build:</span>
                      <span class="info-value">2024.12.15</span>
                    </div>
                    <div class="info-item">
                      <span class="info-label">API Version:</span>
                      <span class="info-value">v1</span>
                    </div>
                  </div>

                  <div class="system-info">
                    <h3>System Information</h3>
                    <div class="info-grid">
                      <div class="info-item">
                        <span class="info-label">Total Monitors:</span>
                        <span class="info-value">{{ systemInfo.totalMonitors }}</span>
                      </div>
                      <div class="info-item">
                        <span class="info-label">Total Checks:</span>
                        <span class="info-value">{{ systemInfo.totalChecks }}</span>
                      </div>
                      <div class="info-item">
                        <span class="info-label">Uptime:</span>
                        <span class="info-value">{{ systemInfo.systemUptime }}</span>
                      </div>
                      <div class="info-item">
                        <span class="info-label">Database Size:</span>
                        <span class="info-value">{{ systemInfo.databaseSize }}</span>
                      </div>
                    </div>
                  </div>

                  <div class="links-section">
                    <h3>Resources</h3>
                    <div class="links-grid">
                      <a href="#" class="resource-link">
                        <mat-icon>description</mat-icon>
                        <span>Documentation</span>
                      </a>
                      <a href="#" class="resource-link">
                        <mat-icon>bug_report</mat-icon>
                        <span>Report Bug</span>
                      </a>
                      <a href="#" class="resource-link">
                        <mat-icon>contact_support</mat-icon>
                        <span>Support</span>
                      </a>
                      <a href="#" class="resource-link">
                        <mat-icon>update</mat-icon>
                        <span>Check Updates</span>
                      </a>
                    </div>
                  </div>
                </div>
              </mat-card-content>
            </mat-card>
          </div>
        </mat-tab>
      </mat-tab-group>
    </div>
  `,
  styleUrls: ['./settings.component.scss']
})
export class SettingsComponent implements OnInit {
  generalForm: FormGroup;
  notificationForm: FormGroup;
  dataRetention = '90';

  apiKeys = [
    { key: 'iu_1234567890abcdef', created: '2024-12-01' },
    { key: 'iu_fedcba0987654321', created: '2024-11-15' }
  ];

  systemInfo = {
    totalMonitors: 12,
    totalChecks: 146853,
    systemUptime: '15 days',
    databaseSize: '2.3 GB'
  };

  constructor(
    private fb: FormBuilder,
    private notificationService: NotificationService
  ) {
    this.generalForm = this.fb.group({
      appName: ['Inferno Uptime', Validators.required],
      defaultInterval: [30, Validators.required],
      timezone: ['UTC', Validators.required],
      darkMode: [false],
      autoRefresh: [true]
    });

    this.notificationForm = this.fb.group({
      emailEnabled: [false],
      emailRecipients: [''],
      emailOnDown: [true],
      emailOnUp: [true],
      emailOnSlow: [false],
      webhookEnabled: [false],
      webhookUrl: [''],
      webhookOnDown: [true],
      webhookOnUp: [true],
      webhookOnSlow: [false]
    });
  }

  ngOnInit() {
    this.loadSettings();
  }

  private loadSettings() {
    // Load settings from localStorage or API
    const savedSettings = localStorage.getItem('infernoUptimeSettings');
    if (savedSettings) {
      const settings = JSON.parse(savedSettings);
      this.generalForm.patchValue(settings.general || {});
      this.notificationForm.patchValue(settings.notifications || {});
      this.dataRetention = settings.dataRetention || '90';
    }
  }

  saveGeneralSettings() {
    if (this.generalForm.valid) {
      const settings = this.getStoredSettings();
      settings.general = this.generalForm.value;
      localStorage.setItem('infernoUptimeSettings', JSON.stringify(settings));
      
      this.notificationService.showSuccess('General settings saved successfully');
    }
  }

  saveNotificationSettings() {
    if (this.notificationForm.valid) {
      const settings = this.getStoredSettings();
      settings.notifications = this.notificationForm.value;
      localStorage.setItem('infernoUptimeSettings', JSON.stringify(settings));
      
      this.notificationService.showSuccess('Notification settings saved successfully');
    }
  }

  testNotifications() {
    this.notificationService.showInfo('Test notification sent!');
  }

  exportData() {
    // Simulate data export
    const data = {
      monitors: [],
      checks: [],
      incidents: [],
      exportDate: new Date().toISOString()
    };
    
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `inferno-uptime-export-${new Date().toISOString().split('T')[0]}.json`;
    a.click();
    URL.revokeObjectURL(url);
    
    this.notificationService.showSuccess('Data export completed');
  }

  clearAllData() {
    if (confirm('⚠️ This will permanently delete ALL monitoring data. This action cannot be undone. Are you sure?')) {
      // Simulate data clearing
      localStorage.clear();
      this.notificationService.showWarning('All data has been cleared');
    }
  }

  generateApiKey() {
    const newKey = {
      key: 'iu_' + Math.random().toString(36).substring(2, 18),
      created: new Date().toISOString().split('T')[0]
    };
    
    this.apiKeys.unshift(newKey);
    this.notificationService.showSuccess('New API key generated');
  }

  revokeApiKey(key: any) {
    if (confirm(`Revoke API key ${key.key}?`)) {
      this.apiKeys = this.apiKeys.filter(k => k.key !== key.key);
      this.notificationService.showSuccess('API key revoked');
    }
  }

  addWebhookEndpoint() {
    this.notificationService.showInfo('Webhook endpoint configuration coming soon');
  }

  private getStoredSettings(): any {
    const stored = localStorage.getItem('infernoUptimeSettings');
    return stored ? JSON.parse(stored) : {};
  }
}