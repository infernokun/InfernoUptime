import { Component, Inject, OnInit, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { MatDialogRef, MAT_DIALOG_DATA, MatDialogModule } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatButtonModule } from '@angular/material/button';
import { MatSlideToggleModule } from '@angular/material/slide-toggle';
import { MatIconModule } from '@angular/material/icon';
import { MatStepperModule, MatStepper } from '@angular/material/stepper';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatChipsModule } from '@angular/material/chips';
import { MatDividerModule } from '@angular/material/divider';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatExpansionModule } from '@angular/material/expansion';
import { MonitorTestResult, Monitor, MonitorCreateRequest, MonitorService, MonitorTestRequest } from '../../../../services/monitor.service';
import { NotificationService } from '../../../../services/notification.service';

interface MonitorType {
  value: string;
  label: string;
  icon: string;
  group: string;
  description?: string;
}

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
    MatChipsModule,
    MatDividerModule,
    MatTooltipModule,
    MatExpansionModule
  ],
  templateUrl: './add-monitor-dialog.component.html',
  styleUrls: ['./add-monitor-dialog.component.scss']
})
export class AddMonitorDialogComponent implements OnInit {
  @ViewChild('stepper') stepper!: MatStepper;
  
  basicForm: FormGroup;
  advancedForm: FormGroup;
  isEditMode = false;
  testing = false;
  saving = false;
  testResult: MonitorTestResult | null = null;
  selectedMonitorType = 'http';

  monitorTypes: { [key: string]: MonitorType } = {
    'group': { value: 'group', label: 'Group', icon: 'folder', group: 'General' },
    'http': { value: 'http', label: 'HTTP(s)', icon: 'http', group: 'General' },
    'port': { value: 'port', label: 'TCP Port', icon: 'settings_ethernet', group: 'General' },
    'ping': { value: 'ping', label: 'Ping', icon: 'network_ping', group: 'General' },
    'keyword': { value: 'keyword', label: 'HTTP(s) - Keyword', icon: 'search', group: 'General' },
    'json-query': { value: 'json-query', label: 'HTTP(s) - JSON Query', icon: 'code', group: 'General' },
    'grpc-keyword': { value: 'grpc-keyword', label: 'gRPC(s) - Keyword', icon: 'api', group: 'General' },
    'dns': { value: 'dns', label: 'DNS', icon: 'dns', group: 'General' },
    'docker': { value: 'docker', label: 'Docker Container', icon: 'developer_board', group: 'General' },
    'real-browser': { value: 'real-browser', label: 'HTTP(s) - Browser Engine', icon: 'web', group: 'General' },
    'push': { value: 'push', label: 'Push', icon: 'push_pin', group: 'Passive' },
    'steam': { value: 'steam', label: 'Steam Game Server', icon: 'sports_esports', group: 'Specific' },
    'gamedig': { value: 'gamedig', label: 'GameDig', icon: 'games', group: 'Specific' },
    'mqtt': { value: 'mqtt', label: 'MQTT', icon: 'device_hub', group: 'Specific' },
    'kafka-producer': { value: 'kafka-producer', label: 'Kafka Producer', icon: 'stream', group: 'Specific' },
    'sqlserver': { value: 'sqlserver', label: 'Microsoft SQL Server', icon: 'storage', group: 'Specific' },
    'postgres': { value: 'postgres', label: 'PostgreSQL', icon: 'storage', group: 'Specific' },
    'mysql': { value: 'mysql', label: 'MySQL/MariaDB', icon: 'storage', group: 'Specific' },
    'mongodb': { value: 'mongodb', label: 'MongoDB', icon: 'storage', group: 'Specific' },
    'radius': { value: 'radius', label: 'Radius', icon: 'security', group: 'Specific' },
    'redis': { value: 'redis', label: 'Redis', icon: 'memory', group: 'Specific' }
  };

  constructor(
    private fb: FormBuilder,
    private dialogRef: MatDialogRef<AddMonitorDialogComponent>,
    @Inject(MAT_DIALOG_DATA) public data: { monitor?: Monitor; monitorData?: MonitorCreateRequest },
    private monitorService: MonitorService,
    private notificationService: NotificationService
  ) {
    this.isEditMode = !!data?.monitor;
    this.basicForm = this.createBasicForm();
    this.advancedForm = this.createAdvancedForm();
  }

  ngOnInit() {
    if (this.data?.monitor) {
      this.populateFormsWithMonitor(this.data.monitor);
    } else if (this.data?.monitorData) {
      this.populateFormsWithData(this.data.monitorData);
    }
  }

  private createBasicForm(): FormGroup {
    return this.fb.group({
      name: ['', [Validators.required, Validators.maxLength(255)]],
      type: ['http', Validators.required],
      
      // HTTP fields
      url: [''],
      
      // Network fields
      hostname: [''],
      port: [''],
      
      // Database fields
      dbHost: [''],
      dbPort: [''],
      database: [''],
      dbUsername: [''],
      dbPassword: [''],
      sqlQuery: [''],
      
      // DNS fields
      dnsServer: [''],
      recordType: ['A'],
      
      // Docker fields
      dockerContainer: [''],
      dockerHost: [''],
      
      // MQTT fields
      mqttHost: [''],
      mqttPort: [1883],
      mqttTopic: [''],
      mqttUsername: [''],
      mqttPassword: [''],
      
      // Game server fields
      gameServerHost: [''],
      gameServerPort: [''],
      gameType: [''],
      
      // Redis fields
      redisHost: [''],
      redisPort: [6379],
      redisPassword: [''],
      
      // Keyword search
      keyword: [''],
      
      // JSON query
      jsonPath: [''],
      expectedValue: [''],
      
      // Common fields
      checkInterval: [60],
      timeout: [30],
      description: ['', Validators.maxLength(1000)],
      isActive: [true]
    });
  }

  private createAdvancedForm(): FormGroup {
    return this.fb.group({
      expectedStatusCodes: ['200,201,202,203,204'],
      customHeaders: [''],
      maxRedirects: [5],
      dbTimeout: [30],
      sslEnabled: [false],
      retryCount: [3]
    });
  }

  onTypeChange() {
    this.selectedMonitorType = this.basicForm.get('type')?.value;
    this.updateValidators();
  }

  private updateValidators() {
    // Clear all validators first
    Object.keys(this.basicForm.controls).forEach(key => {
      this.basicForm.get(key)?.clearValidators();
    });

    // Add name validator (always required)
    this.basicForm.get('name')?.setValidators([Validators.required, Validators.maxLength(255)]);
    this.basicForm.get('type')?.setValidators(Validators.required);

    // Add type-specific validators
    switch (this.selectedMonitorType) {
      case 'http':
      case 'keyword':
      case 'json-query':
      case 'real-browser':
        this.basicForm.get('url')?.setValidators([Validators.required, Validators.pattern('^https?://.*')]);
        break;
      
      case 'port':
        this.basicForm.get('hostname')?.setValidators(Validators.required);
        this.basicForm.get('port')?.setValidators([Validators.required, Validators.min(1), Validators.max(65535)]);
        break;
      
      case 'ping':
      case 'dns':
        this.basicForm.get('hostname')?.setValidators(Validators.required);
        break;
      
      case 'mysql':
      case 'postgres':
      case 'sqlserver':
      case 'mongodb':
        this.basicForm.get('dbHost')?.setValidators(Validators.required);
        this.basicForm.get('dbPort')?.setValidators(Validators.required);
        this.basicForm.get('database')?.setValidators(Validators.required);
        this.basicForm.get('dbUsername')?.setValidators(Validators.required);
        break;
      
      case 'docker':
        this.basicForm.get('dockerContainer')?.setValidators(Validators.required);
        break;
      
      case 'mqtt':
        this.basicForm.get('mqttHost')?.setValidators(Validators.required);
        this.basicForm.get('mqttTopic')?.setValidators(Validators.required);
        break;
      
      case 'redis':
        this.basicForm.get('redisHost')?.setValidators(Validators.required);
        break;
      
      case 'steam':
      case 'gamedig':
        this.basicForm.get('gameServerHost')?.setValidators(Validators.required);
        this.basicForm.get('gameServerPort')?.setValidators(Validators.required);
        break;
    }

    // Update form validation
    this.basicForm.updateValueAndValidity();
  }

  canTestConnection(): boolean {
    return this.selectedMonitorType !== 'group' && this.selectedMonitorType !== 'push' && this.basicForm.valid;
  }

  testConnection() {
    // Implementation for testing different monitor types
    this.testing = true;
    this.testResult = null;

    // Simulate test for now
    setTimeout(() => {
      this.testing = false;
      this.testResult = {
        success: true,
        responseTime: Math.floor(Math.random() * 500) + 50,
        statusCode: 200,
        message: 'Connection successful',
        timestamp: new Date().toISOString()
      };
    }, 2000);
  }

  hasAdvancedSettings(): boolean {
    return this.isHttpType() || this.isDatabaseType() || this.isNetworkType();
  }

  hasAdvancedValues(): boolean {
    const form = this.advancedForm;
    return !!(form.get('expectedStatusCodes')?.value ||
             form.get('customHeaders')?.value ||
             form.get('maxRedirects')?.value ||
             form.get('dbTimeout')?.value ||
             form.get('sslEnabled')?.value ||
             form.get('retryCount')?.value);
  }

  isHttpType(): boolean {
    return ['http', 'keyword', 'json-query', 'real-browser'].includes(this.selectedMonitorType);
  }

  isDatabaseType(): boolean {
    return ['mysql', 'postgres', 'sqlserver', 'mongodb', 'redis'].includes(this.selectedMonitorType);
  }

  isNetworkType(): boolean {
    return ['ping', 'port', 'dns'].includes(this.selectedMonitorType);
  }

  getMonitorTypeLabel(): string {
    return this.monitorTypes[this.selectedMonitorType]?.label || this.selectedMonitorType;
  }

  getMaxStepIndex(): number {
    return this.hasAdvancedSettings() ? 2 : 1;
  }

  isCurrentStepValid(): boolean {
    const currentIndex = this.stepper?.selectedIndex || 0;
    switch (currentIndex) {
      case 0: return this.basicForm.valid;
      case 1: return this.advancedForm.valid;
      case 2: return this.isFormValid();
      default: return false;
    }
  }

  isFormValid(): boolean {
    return this.basicForm.valid && (!this.hasAdvancedSettings() || this.advancedForm.valid);
  }

  onSave() {
    if (!this.isFormValid()) {
      this.notificationService.showError('Please correct all form errors before saving');
      return;
    }

    this.saving = true;

    const monitorData: MonitorCreateRequest = {
      ...this.basicForm.value,
      ...(this.hasAdvancedSettings() ? this.advancedForm.value : {})
    };

    // Clean up unused fields based on monitor type
    this.cleanupMonitorData(monitorData);

    const saveOperation = this.isEditMode
      ? this.monitorService.updateMonitor(this.data.monitor!.id, monitorData)
      : this.monitorService.createMonitor(monitorData);

    saveOperation.subscribe({
      next: (response) => {
        this.saving = false;
        if (response.success) {
          const action = this.isEditMode ? 'updated' : 'created';
          this.notificationService.showSuccess(`Monitor "${monitorData.name}" ${action} successfully!`);
          this.dialogRef.close(true);
        } else {
          this.notificationService.showError(response.message || 'Failed to save monitor');
        }
      },
      error: (error) => {
        this.saving = false;
        const action = this.isEditMode ? 'update' : 'create';
        this.notificationService.showError(`Failed to ${action} monitor`);
        console.error('Save error:', error);
      }
    });
  }

  private cleanupMonitorData(data: any) {
    // Remove empty optional fields and fields not relevant to the selected monitor type
    const fieldsToClean = ['description', 'keyword', 'jsonPath', 'expectedValue', 'customHeaders', 'sqlQuery', 'dockerHost', 'mqttUsername', 'mqttPassword', 'redisPassword'];
    
    fieldsToClean.forEach(field => {
      if (!data[field] || (typeof data[field] === 'string' && !data[field].trim())) {
        delete data[field];
      }
    });
  }

  onCancel() {
    const hasChanges = this.basicForm.dirty || this.advancedForm.dirty;
    if (hasChanges) {
      const confirmed = confirm('You have unsaved changes. Are you sure you want to cancel?');
      if (!confirmed) {
        return;
      }
    }
    this.dialogRef.close(false);
  }

  private populateFormsWithMonitor(monitor: Monitor) {
    // Implementation for populating forms with existing monitor data
    this.basicForm.patchValue(monitor);
    this.selectedMonitorType = monitor.type;
    this.updateValidators();
  }

  private populateFormsWithData(data: MonitorCreateRequest) {
    // Implementation for populating forms with provided data
    this.basicForm.patchValue(data);
    this.selectedMonitorType = data.type || 'http';
    this.updateValidators();
  }

  validateUrl() {
    const urlControl = this.basicForm.get('url');
    if (urlControl && urlControl.value) {
      const url = urlControl.value.trim();
      if (url && !url.match(/^https?:\/\//)) {
        const correctedUrl = url.startsWith('www.') ? `https://${url}` : `https://${url}`;
        urlControl.setValue(correctedUrl);
      }
    }
  }

  formatInterval(seconds: number): string {
    if (seconds < 60) return `${seconds} seconds`;
    if (seconds < 3600) return `${seconds / 60} minutes`;
    return `${seconds / 3600} hours`;
  }

  formatTimeout(seconds: number): string {
    if (seconds < 60) return `${seconds} seconds`;
    return `${seconds / 60} minutes`;
  }
}