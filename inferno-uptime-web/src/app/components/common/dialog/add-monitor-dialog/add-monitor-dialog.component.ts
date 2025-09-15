import { Component, Inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { MatDialogRef, MAT_DIALOG_DATA, MatDialogModule } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatButtonModule } from '@angular/material/button';
import { MatSlideToggleModule } from '@angular/material/slide-toggle';
import { MatIconModule } from '@angular/material/icon';
import { MatStepperModule } from '@angular/material/stepper';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatChipsModule } from '@angular/material/chips';
import { MonitorTestResult, Monitor, MonitorCreateRequest, MonitorService, MonitorTestRequest } from '../../../../services/monitor.service';
import { NotificationService } from '../../../../services/notification.service';

@Component({
  selector: 'app-add-monitor-dialog',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    MatDialogModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    MatButtonModule,
    MatSlideToggleModule,
    MatIconModule,
    MatStepperModule,
    MatProgressSpinnerModule,
    MatChipsModule
  ],
  template: `
    <div class="add-monitor-dialog">
      <h2 mat-dialog-title>
        <mat-icon>{{ isEditMode ? 'edit' : 'add' }}</mat-icon>
        {{ isEditMode ? 'Edit Monitor' : 'Add New Monitor' }}
      </h2>

      <mat-dialog-content>
        <mat-stepper #stepper orientation="vertical" linear="false">
          <!-- Step 1: Basic Configuration -->
          <mat-step [stepControl]="basicForm" label="Basic Configuration">
            <form [formGroup]="basicForm" class="form-section">
              <div class="form-row">
                <mat-form-field appearance="outline" class="full-width">
                  <mat-label>Monitor Name</mat-label>
                  <input matInput formControlName="name" placeholder="My Website Monitor">
                  <mat-error *ngIf="basicForm.get('name')?.hasError('required')">
                    Monitor name is required
                  </mat-error>
                </mat-form-field>
              </div>

              <div class="form-row">
                <mat-form-field appearance="outline" class="full-width">
                  <mat-label>URL to Monitor</mat-label>
                  <input matInput formControlName="url" placeholder="https://example.com">
                  <mat-icon matSuffix>link</mat-icon>
                  <mat-error *ngIf="basicForm.get('url')?.hasError('required')">
                    URL is required
                  </mat-error>
                  <mat-error *ngIf="basicForm.get('url')?.hasError('pattern')">
                    Please enter a valid URL starting with http:// or https://
                  </mat-error>
                </mat-form-field>
              </div>

              <div class="form-row">
                <mat-form-field appearance="outline">
                  <mat-label>Monitor Type</mat-label>
                  <mat-select formControlName="type">
                    <mat-option value="HTTP">HTTP</mat-option>
                    <mat-option value="HTTPS">HTTPS</mat-option>
                    <mat-option value="TCP">TCP</mat-option>
                    <mat-option value="PING">Ping</mat-option>
                    <mat-option value="DNS">DNS</mat-option>
                  </mat-select>
                </mat-form-field>

                <mat-form-field appearance="outline">
                  <mat-label>Check Interval (seconds)</mat-label>
                  <input matInput type="number" formControlName="checkInterval" min="10" max="3600">
                  <mat-hint>Minimum: 10 seconds, Maximum: 1 hour</mat-hint>
                </mat-form-field>
              </div>

              <div class="form-row">
                <mat-form-field appearance="outline" class="full-width">
                  <mat-label>Description (Optional)</mat-label>
                  <textarea matInput formControlName="description" rows="3" 
                            placeholder="Brief description of what this monitor checks"></textarea>
                </mat-form-field>
              </div>

              <div class="form-row">
                <mat-slide-toggle formControlName="isActive" color="primary">
                  Enable monitor after creation
                </mat-slide-toggle>
              </div>

              <div class="step-actions">
                <button mat-raised-button color="primary" (click)="testConnection()" 
                        [disabled]="!basicForm.valid || testing">
                  <mat-spinner diameter="20" *ngIf="testing"></mat-spinner>
                  <mat-icon *ngIf="!testing">play_arrow</mat-icon>
                  Test Connection
                </button>
                
                <div class="test-result" *ngIf="testResult">
                  <div class="test-success" *ngIf="testResult.success">
                    <mat-icon>check_circle</mat-icon>
                    <span>Connection successful! ({{ testResult.responseTime }}ms)</span>
                  </div>
                  <div class="test-error" *ngIf="!testResult.success">
                    <mat-icon>error</mat-icon>
                    <span>{{ testResult.message }}</span>
                  </div>
                </div>
              </div>
            </form>
          </mat-step>

          <!-- Step 2: Advanced Settings -->
          <mat-step [stepControl]="advancedForm" label="Advanced Settings" [optional]="true">
            <form [formGroup]="advancedForm" class="form-section">
              <div class="form-row">
                <mat-form-field appearance="outline">
                  <mat-label>Timeout (seconds)</mat-label>
                  <input matInput type="number" formControlName="timeoutSeconds" min="5" max="300">
                  <mat-hint>Request timeout in seconds</mat-hint>
                </mat-form-field>

                <mat-form-field appearance="outline">
                  <mat-label>Max Redirects</mat-label>
                  <input matInput type="number" formControlName="maxRedirects" min="0" max="10">
                  <mat-hint>Maximum number of redirects to follow</mat-hint>
                </mat-form-field>
              </div>

              <div class="form-row">
                <mat-form-field appearance="outline" class="full-width">
                  <mat-label>Expected Status Codes</mat-label>
                  <input matInput formControlName="expectedStatusCodes" 
                         placeholder="200,201,202,203,204">
                  <mat-hint>Comma-separated list of acceptable HTTP status codes</mat-hint>
                </mat-form-field>
              </div>

              <div class="form-row">
                <mat-form-field appearance="outline" class="full-width">
                  <mat-label>Keyword to Check (Optional)</mat-label>
                  <input matInput formControlName="keywordCheck" 
                         placeholder="Success, Welcome, etc.">
                  <mat-hint>The response must contain this keyword to be considered successful</mat-hint>
                </mat-form-field>
              </div>

              <div class="form-row">
                <mat-form-field appearance="outline" class="full-width">
                  <mat-label>Custom Headers (Optional)</mat-label>
                  <textarea matInput formControlName="customHeaders" rows="4"
                            placeholder='{"Authorization": "Bearer token", "User-Agent": "Custom Agent"}'>
                  </textarea>
                  <mat-hint>JSON format for custom HTTP headers</mat-hint>
                </mat-form-field>
              </div>
            </form>
          </mat-step>

          <!-- Step 3: Review -->
          <mat-step label="Review & Save">
            <div class="review-section">
              <h3>Review Your Monitor Configuration</h3>
              
              <div class="config-summary">
                <div class="config-item">
                  <span class="config-label">Name:</span>
                  <span class="config-value">{{ basicForm.get('name')?.value }}</span>
                </div>
                <div class="config-item">
                  <span class="config-label">URL:</span>
                  <span class="config-value">{{ basicForm.get('url')?.value }}</span>
                </div>
                <div class="config-item">
                  <span class="config-label">Type:</span>
                  <span class="config-value">{{ basicForm.get('type')?.value }}</span>
                </div>
                <div class="config-item">
                  <span class="config-label">Check Interval:</span>
                  <span class="config-value">{{ basicForm.get('checkInterval')?.value }} seconds</span>
                </div>
                <div class="config-item">
                  <span class="config-label">Timeout:</span>
                  <span class="config-value">{{ advancedForm.get('timeoutSeconds')?.value }} seconds</span>
                </div>
                <div class="config-item" *ngIf="basicForm.get('description')?.value">
                  <span class="config-label">Description:</span>
                  <span class="config-value">{{ basicForm.get('description')?.value }}</span>
                </div>
                <div class="config-item">
                  <span class="config-label">Status:</span>
                  <mat-chip [color]="basicForm.get('isActive')?.value ? 'primary' : 'warn'" selected>
                    {{ basicForm.get('isActive')?.value ? 'Active' : 'Inactive' }}
                  </mat-chip>
                </div>
              </div>

              <div class="final-test" *ngIf="!testResult || !testResult.success">
                <p>⚠️ Run a final test to ensure your monitor configuration is working correctly.</p>
                <button mat-stroked-button (click)="testConnection()" [disabled]="testing">
                  <mat-spinner diameter="20" *ngIf="testing"></mat-spinner>
                  <mat-icon *ngIf="!testing">play_arrow</mat-icon>
                  Test Again
                </button>
              </div>

              <div class="success-indicator" *ngIf="testResult?.success">
                <mat-icon>check_circle</mat-icon>
                <span>Configuration tested successfully!</span>
              </div>
            </div>
          </mat-step>
        </mat-stepper>
      </mat-dialog-content>

      <mat-dialog-actions align="end">
        <button mat-button (click)="onCancel()">Cancel</button>
        <button mat-button (click)="stepper.previous()" 
                *ngIf="stepper.selectedIndex > 0">
          Previous
        </button>
        <button mat-button (click)="stepper.next()" 
                *ngIf="stepper.selectedIndex < 2"
                [disabled]="!isCurrentStepValid()">
          Next
        </button>
        <button mat-raised-button color="primary" 
                (click)="onSave()" 
                [disabled]="!isFormValid() || saving"
                *ngIf="stepper.selectedIndex === 2">
          <mat-spinner diameter="20" *ngIf="saving"></mat-spinner>
          <mat-icon *ngIf="!saving">{{ isEditMode ? 'save' : 'add' }}</mat-icon>
          {{ isEditMode ? 'Update Monitor' : 'Create Monitor' }}
        </button>
      </mat-dialog-actions>
    </div>
  `,
  styleUrls: ['./add-monitor-dialog.component.scss']
})
export class AddMonitorDialogComponent implements OnInit {
  basicForm: FormGroup = new FormGroup(undefined);
  advancedForm: FormGroup = new FormGroup(undefined);
  isEditMode = false;
  testing = false;
  saving = false;
  testResult: MonitorTestResult | null = null;

  constructor(
    private fb: FormBuilder,
    private dialogRef: MatDialogRef<AddMonitorDialogComponent>,
    @Inject(MAT_DIALOG_DATA) public data: { monitor?: Monitor; monitorData?: MonitorCreateRequest },
    private monitorService: MonitorService,
    private notificationService: NotificationService
  ) {
    this.isEditMode = !!data.monitor;
    this.initializeForms();
  }

  ngOnInit() {
    if (this.data.monitor) {
      this.populateFormsWithMonitor(this.data.monitor);
    } else if (this.data.monitorData) {
      this.populateFormsWithData(this.data.monitorData);
    }
  }

  private initializeForms() {
    this.basicForm = this.fb.group({
      name: ['', [Validators.required, Validators.maxLength(255)]],
      url: ['', [Validators.required, Validators.pattern('^https?://.*')]],
      type: ['HTTP', Validators.required],
      checkInterval: [30, [Validators.required, Validators.min(10), Validators.max(3600)]],
      description: ['', Validators.maxLength(1000)],
      isActive: [true]
    });

    this.advancedForm = this.fb.group({
      timeoutSeconds: [30, [Validators.required, Validators.min(5), Validators.max(300)]],
      maxRedirects: [5, [Validators.required, Validators.min(0), Validators.max(10)]],
      expectedStatusCodes: ['200,201,202,203,204'],
      keywordCheck: [''],
      customHeaders: ['']
    });
  }

  private populateFormsWithMonitor(monitor: Monitor) {
    this.basicForm.patchValue({
      name: monitor.name,
      url: monitor.url,
      type: monitor.type,
      checkInterval: monitor.checkInterval,
      description: monitor.description,
      isActive: monitor.isActive
    });

    this.advancedForm.patchValue({
      timeoutSeconds: monitor.timeoutSeconds,
      maxRedirects: monitor.maxRedirects,
      expectedStatusCodes: monitor.expectedStatusCodes,
      keywordCheck: monitor.keywordCheck,
      customHeaders: monitor.customHeaders
    });
  }

  private populateFormsWithData(data: MonitorCreateRequest) {
    this.basicForm.patchValue({
      name: data.name,
      url: data.url,
      type: data.type,
      checkInterval: data.checkInterval || 30,
      description: data.description,
      isActive: data.isActive !== undefined ? data.isActive : true
    });

    this.advancedForm.patchValue({
      timeoutSeconds: data.timeoutSeconds || 30,
      maxRedirects: data.maxRedirects || 5,
      expectedStatusCodes: data.expectedStatusCodes || '200,201,202,203,204',
      keywordCheck: data.keywordCheck,
      customHeaders: data.customHeaders
    });
  }

  testConnection() {
    if (!this.basicForm.valid) {
      this.notificationService.showError('Please fill in all required fields');
      return;
    }

    this.testing = true;
    this.testResult = null;

    const testRequest: MonitorTestRequest = {
      url: this.basicForm.get('url')?.value,
      type: this.basicForm.get('type')?.value,
      timeoutSeconds: this.advancedForm.get('timeoutSeconds')?.value,
      expectedStatusCodes: this.advancedForm.get('expectedStatusCodes')?.value,
      keywordCheck: this.advancedForm.get('keywordCheck')?.value,
      customHeaders: this.advancedForm.get('customHeaders')?.value
    };

    this.monitorService.testMonitorConfiguration(testRequest).subscribe({
      next: (response) => {
        this.testing = false;
        if (response.success) {
          this.testResult = response.data;
          if (response.data.success) {
            this.notificationService.showSuccess('Connection test successful!');
          } else {
            this.notificationService.showWarning('Connection test failed');
          }
        }
      },
      error: (error) => {
        this.testing = false;
        this.notificationService.showError('Failed to test connection');
        console.error('Test error:', error);
      }
    });
  }

  isCurrentStepValid(): boolean {
    switch (this.getCurrentStepIndex()) {
      case 0: return this.basicForm.valid;
      case 1: return this.advancedForm.valid;
      case 2: return this.isFormValid();
      default: return false;
    }
  }

  private getCurrentStepIndex(): number {
    // This would need to be implemented based on the stepper's current index
    return 0; // Placeholder
  }

  isFormValid(): boolean {
    return this.basicForm.valid && this.advancedForm.valid;
  }

  onSave() {
    if (!this.isFormValid()) {
      this.notificationService.showError('Please correct the form errors');
      return;
    }

    this.saving = true;

    const monitorData: MonitorCreateRequest = {
      ...this.basicForm.value,
      ...this.advancedForm.value
    };

    const saveOperation = this.isEditMode
      ? this.monitorService.updateMonitor(this.data.monitor!.id, monitorData)
      : this.monitorService.createMonitor(monitorData);

    saveOperation.subscribe({
      next: (response) => {
        this.saving = false;
        if (response.success) {
          this.notificationService.showSuccess(
            `Monitor ${this.isEditMode ? 'updated' : 'created'} successfully!`
          );
          this.dialogRef.close(true);
        }
      },
      error: (error) => {
        this.saving = false;
        this.notificationService.showError(
          `Failed to ${this.isEditMode ? 'update' : 'create'} monitor`
        );
        console.error('Save error:', error);
      }
    });
  }

  onCancel() {
    this.dialogRef.close(false);
  }
}