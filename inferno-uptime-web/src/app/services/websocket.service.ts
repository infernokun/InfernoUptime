import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable, Subject } from 'rxjs';
import { Client, Message, StompSubscription } from '@stomp/stompjs';
import SockJS from 'sockjs-client';
import { EnvironmentService } from './environment.service';

export interface MonitorUpdate {
  monitorId: number;
  monitorName: string;
  url: string;
  status: string;
  isUp: boolean;
  responseTime: number;
  statusCode?: number;
  message: string;
  timestamp: string;
}

export interface DashboardSummary {
  totalMonitors: number;
  activeMonitors: number;
  monitorsUp: number;
  monitorsDown: number;
  monitorsPending: number;
  overallUptime: number;
  averageResponseTime: number;
  totalChecksToday: number;
}

export interface SystemAlert {
  message: string;
  level: 'INFO' | 'WARNING' | 'ERROR' | 'CRITICAL';
  timestamp: string;
}

@Injectable({
  providedIn: 'root'
})
export class WebSocketService {
  private client: Client = new Client();
  private connectionSubject = new BehaviorSubject<boolean>(false);
  private monitorUpdatesSubject = new Subject<MonitorUpdate>();
  private dashboardSubject = new Subject<DashboardSummary>();
  private alertsSubject = new Subject<SystemAlert>();
  private subscriptions: StompSubscription[] = [];

  constructor(private environmentService: EnvironmentService) {
    this.initializeClient();
  }

  private initializeClient() {
    this.client = new Client({
      webSocketFactory: () => new SockJS(this.environmentService.settings!.websocketUrl),
      connectHeaders: {},
      debug: (str) => {
        console.log('STOMP Debug:', str);
      },
      reconnectDelay: 5000,
      heartbeatIncoming: 4000,
      heartbeatOutgoing: 4000,
    });

    this.client.onConnect = (frame) => {
      console.log(' WebSocket Connected:', frame);
      this.connectionSubject.next(true);
      this.subscribeToTopics();
    };

    this.client.onStompError = (frame) => {
      console.error(' WebSocket STOMP Error:', frame);
      this.connectionSubject.next(false);
    };

    this.client.onWebSocketError = (event) => {
      console.error(' WebSocket Error:', event);
      this.connectionSubject.next(false);
    };

    this.client.onDisconnect = (frame) => {
      console.log(' WebSocket Disconnected:', frame);
      this.connectionSubject.next(false);
    };
  }

  connect(): Observable<boolean> {
    if (!this.client.active) {
      this.client.activate();
    }
    return this.connectionSubject.asObservable();
  }

  disconnect() {
    this.subscriptions.forEach(sub => sub.unsubscribe());
    this.subscriptions = [];
    
    if (this.client.active) {
      this.client.deactivate();
    }
  }

  private subscribeToTopics() {
    // Clear existing subscriptions
    this.subscriptions.forEach(sub => sub.unsubscribe());
    this.subscriptions = [];

    // Subscribe to monitor updates
    const monitorSub = this.client.subscribe('/topic/monitors/updates', (message: Message) => {
      try {
        const update: MonitorUpdate = JSON.parse(message.body);
        this.monitorUpdatesSubject.next(update);
      } catch (error) {
        console.error('Error parsing monitor update:', error);
      }
    });

    // Subscribe to dashboard updates
    const dashboardSub = this.client.subscribe('/topic/dashboard', (message: Message) => {
      try {
        const summary: DashboardSummary = JSON.parse(message.body);
        this.dashboardSubject.next(summary);
      } catch (error) {
        console.error('Error parsing dashboard update:', error);
      }
    });

    // Subscribe to system alerts
    const alertsSub = this.client.subscribe('/topic/alerts', (message: Message) => {
      try {
        const alert: SystemAlert = JSON.parse(message.body);
        this.alertsSubject.next(alert);
      } catch (error) {
        console.error('Error parsing system alert:', error);
      }
    });

    this.subscriptions.push(monitorSub, dashboardSub, alertsSub);
  }

  // Observable getters
  subscribeToMonitors(): Observable<MonitorUpdate> {
    return this.monitorUpdatesSubject.asObservable();
  }

  subscribeToDashboard(): Observable<DashboardSummary> {
    return this.dashboardSubject.asObservable();
  }

  subscribeToAlerts(): Observable<SystemAlert> {
    return this.alertsSubject.asObservable();
  }

  subscribeToSpecificMonitor(monitorId: number): Observable<MonitorUpdate> {
    return new Observable(observer => {
      if (!this.client.active) {
        observer.error('WebSocket not connected');
        return;
      }

      const subscription = this.client.subscribe(`/topic/monitors/${monitorId}`, (message: Message) => {
        try {
          const update: MonitorUpdate = JSON.parse(message.body);
          observer.next(update);
        } catch (error) {
          observer.error('Error parsing monitor update: ' + error);
        }
      });

      // Return cleanup function
      return () => {
        subscription.unsubscribe();
      };
    });
  }

  // Send messages to server
  sendPing() {
    if (this.client.active) {
      this.client.publish({
        destination: '/app/ping',
        body: JSON.stringify({ timestamp: Date.now() })
      });
    }
  }

  requestMonitorTest(testData: any) {
    if (this.client.active) {
      this.client.publish({
        destination: '/app/monitor/test',
        body: JSON.stringify(testData)
      });
    }
  }

  // Connection status
  isConnected(): boolean {
    return this.client.active && this.connectionSubject.value;
  }

  getConnectionStatus(): Observable<boolean> {
    return this.connectionSubject.asObservable();
  }
}