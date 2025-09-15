import { Injectable } from '@angular/core';
import { MatSnackBar, MatSnackBarConfig } from '@angular/material/snack-bar';

@Injectable({
  providedIn: 'root'
})
export class NotificationService {
  private defaultConfig: MatSnackBarConfig = {
    duration: 4000,
    horizontalPosition: 'right',
    verticalPosition: 'top',
    panelClass: ['snackbar-default']
  };

  constructor(private snackBar: MatSnackBar) {}

  showSuccess(message: string, action?: string, duration?: number) {
    const config: MatSnackBarConfig = {
      ...this.defaultConfig,
      duration: duration || 4000,
      panelClass: ['snackbar-success']
    };

    this.snackBar.open(message, action || '✕', config);
  }

  showError(message: string, action?: string, duration?: number) {
    const config: MatSnackBarConfig = {
      ...this.defaultConfig,
      duration: duration || 6000,
      panelClass: ['snackbar-error']
    };

    this.snackBar.open(message, action || '✕', config);
  }

  showWarning(message: string, action?: string, duration?: number) {
    const config: MatSnackBarConfig = {
      ...this.defaultConfig,
      duration: duration || 5000,
      panelClass: ['snackbar-warning']
    };

    this.snackBar.open(message, action || '✕', config);
  }

  showInfo(message: string, action?: string, duration?: number) {
    const config: MatSnackBarConfig = {
      ...this.defaultConfig,
      duration: duration || 4000,
      panelClass: ['snackbar-info']
    };

    this.snackBar.open(message, action || '✕', config);
  }

  dismiss() {
    this.snackBar.dismiss();
  }
}