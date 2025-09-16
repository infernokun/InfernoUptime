import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';

export interface EnvironmentSettings {
  production: boolean;
  baseUrl: string;
  restUrl: string;
  baseEndPoint: string;
  websocketUrl: string;
}

@Injectable({
  providedIn: 'root',
})
export class EnvironmentService {
  configUrl = 'assets/environment/app.config.json';
  private configSettings: EnvironmentSettings | undefined = undefined;

  constructor(private http: HttpClient) {}

  get settings() {
    return this.configSettings;
  }

  public load(): Promise<boolean> {
    return new Promise((resolve, reject) => {
      this.http.get<EnvironmentSettings>(this.configUrl).subscribe({
        next: (response: EnvironmentSettings) => {
          this.configSettings = response;
          console.log('getting env settings: ', this.configSettings);
          resolve(true);
        },
        error: (err: any) => {
          console.error('Error reading configuration file: ', err);
          reject(err);
        }
      });
    });
  }
}