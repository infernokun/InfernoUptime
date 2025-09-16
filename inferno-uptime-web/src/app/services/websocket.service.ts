import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable, Subject, timer } from 'rxjs';
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
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 10;
  private isManuallyDisconnected = false;

  constructor(private environmentService: EnvironmentService) {
    console.log('🔌 WebSocket Service initialized');
  }

  private initializeClient() {
    console.log('🔌 Initializing WebSocket client...');
    
    const websocketUrl = this.environmentService.settings?.websocketUrl;
    if (!websocketUrl) {
      console.error('❌ WebSocket URL not configured');
      return;
    }

    console.log('🔌 Connecting to:', websocketUrl);

    this.client = new Client({
      webSocketFactory: () => {
        console.log('🔌 Creating SockJS connection...');
        return new SockJS(websocketUrl);
      },
      connectHeaders: {},
      debug: (str) => {
        if (str.includes('ERROR') || str.includes('RECEIPT')) {
          console.log('🔌 STOMP Debug:', str);
        }
      },
      reconnectDelay: 5000,
      heartbeatIncoming: 4000,
      heartbeatOutgoing: 4000,
      onConnect: (frame) => {
        console.log('✅ WebSocket Connected successfully:', frame.headers);
        this.reconnectAttempts = 0;
        this.connectionSubject.next(true);
        this.subscribeToTopics();
      },
      onStompError: (frame) => {
        console.error('❌ STOMP Protocol Error:', frame.headers);
        console.error('❌ Error body:', frame.body);
        this.connectionSubject.next(false);
        this.handleReconnection();
      },
      onWebSocketError: (event) => {
        console.error('❌ WebSocket Error:', event);
        this.connectionSubject.next(false);
        this.handleReconnection();
      },
      onDisconnect: (frame) => {
        console.log('🔌 WebSocket Disconnected:', frame?.headers || 'No frame');
        this.connectionSubject.next(false);
        if (!this.isManuallyDisconnected) {
          this.handleReconnection();
        }
      },
      onWebSocketClose: (event) => {
        console.log('🔌 WebSocket closed:', event.code, event.reason);
        this.connectionSubject.next(false);
      }
    });
  }

  private handleReconnection() {
    if (this.isManuallyDisconnected) {
      return;
    }

    this.reconnectAttempts++;
    if (this.reconnectAttempts <= this.maxReconnectAttempts) {
      const delay = Math.min(1000 * Math.pow(2, this.reconnectAttempts), 30000);
      console.log(`🔄 Attempting reconnection ${this.reconnectAttempts}/${this.maxReconnectAttempts} in ${delay}ms...`);
      
      timer(delay).subscribe(() => {
        if (!this.isManuallyDisconnected && !this.client.active) {
          this.client.activate();
        }
      });
    } else {
      console.error('❌ Max reconnection attempts reached');
    }
  }

  connect(): Observable<boolean> {
    console.log('🔌 WebSocket connect() called');
    this.isManuallyDisconnected = false;
    
    if (!this.client.connected) {
      this.initializeClient();
      
      if (this.client && !this.client.active) {
        console.log('🔌 Activating WebSocket client...');
        try {
          this.client.activate();
        } catch (error) {
          console.error('❌ Error activating WebSocket client:', error);
          this.connectionSubject.next(false);
        }
      } else {
        console.log('🔌 WebSocket client already active');
      }
    } else {
      console.log('🔌 WebSocket already connected');
      this.connectionSubject.next(true);
    }
    
    return this.connectionSubject.asObservable();
  }

  disconnect() {
    console.log('🔌 Manually disconnecting WebSocket...');
    this.isManuallyDisconnected = true;
    
    // Clear all subscriptions
    this.subscriptions.forEach(sub => {
      try {
        sub.unsubscribe();
      } catch (error) {
        console.error('Error unsubscribing:', error);
      }
    });
    this.subscriptions = [];
    
    // Deactivate client
    if (this.client?.active) {
      try {
        this.client.deactivate();
      } catch (error) {
        console.error('Error deactivating client:', error);
      }
    }
    
    this.connectionSubject.next(false);
  }

  private subscribeToTopics() {
    console.log('🔌 Subscribing to WebSocket topics...');
    
    // Clear existing subscriptions
    this.subscriptions.forEach(sub => {
      try {
        sub.unsubscribe();
      } catch (error) {
        console.error('Error unsubscribing from topic:', error);
      }
    });
    this.subscriptions = [];

    try {
      // Subscribe to monitor updates
      const monitorSub = this.client.subscribe('/topic/monitors/updates', (message: Message) => {
        try {
          const update: MonitorUpdate = JSON.parse(message.body);
          console.log('📊 Monitor update received:', update.monitorName, update.isUp ? 'UP' : 'DOWN');
          this.monitorUpdatesSubject.next(update);
        } catch (error) {
          console.error('❌ Error parsing monitor update:', error);
        }
      });

      // Subscribe to dashboard updates
      const dashboardSub = this.client.subscribe('/topic/dashboard', (message: Message) => {
        try {
          const summary: DashboardSummary = JSON.parse(message.body);
          console.log('📈 Dashboard update received:', summary);
          this.dashboardSubject.next(summary);
        } catch (error) {
          console.error('❌ Error parsing dashboard update:', error);
        }
      });

      // Subscribe to system alerts
      const alertsSub = this.client.subscribe('/topic/alerts', (message: Message) => {
        try {
          const alert: SystemAlert = JSON.parse(message.body);
          console.log('🚨 System alert received:', alert);
          this.alertsSubject.next(alert);
        } catch (error) {
          console.error('❌ Error parsing system alert:', error);
        }
      });

      this.subscriptions.push(monitorSub, dashboardSub, alertsSub);
      console.log('✅ Successfully subscribed to all topics');
      
    } catch (error) {
      console.error('❌ Error subscribing to topics:', error);
    }
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
        console.error('❌ Cannot subscribe to specific monitor: WebSocket not connected');
        observer.error('WebSocket not connected');
        return () => {}; // Return empty cleanup function
      }

      console.log(`🔌 Subscribing to specific monitor: ${monitorId}`);
      
      try {
        const subscription = this.client.subscribe(`/topic/monitors/${monitorId}`, (message: Message) => {
          try {
            const update: MonitorUpdate = JSON.parse(message.body);
            console.log(`📊 Specific monitor update for ${monitorId}:`, update);
            observer.next(update);
          } catch (error) {
            console.error('❌ Error parsing specific monitor update:', error);
            observer.error('Error parsing monitor update: ' + error);
          }
        });

        // Return cleanup function
        return () => {
          console.log(`🔌 Unsubscribing from specific monitor: ${monitorId}`);
          subscription.unsubscribe();
        };
      } catch (error) {
        console.error('❌ Error subscribing to specific monitor:', error);
        observer.error('Error subscribing to monitor: ' + error);
        return () => {}; // Return empty cleanup function
      }
    });
  }

  // Send messages to server
  sendPing() {
    if (this.client.active) {
      console.log('🏓 Sending ping...');
      this.client.publish({
        destination: '/app/ping',
        body: JSON.stringify({ timestamp: Date.now() })
      });
    } else {
      console.warn('⚠️ Cannot send ping: WebSocket not connected');
    }
  }

  requestMonitorTest(testData: any) {
    if (this.client.active) {
      console.log('🧪 Requesting monitor test...');
      this.client.publish({
        destination: '/app/monitor/test',
        body: JSON.stringify(testData)
      });
    } else {
      console.warn('⚠️ Cannot request monitor test: WebSocket not connected');
    }
  }

  // Connection status
  isConnected(): boolean {
    return this.client.active && this.connectionSubject.value;
  }

  getConnectionStatus(): Observable<boolean> {
    return this.connectionSubject.asObservable();
  }

  // Debugging helpers
  getConnectionInfo() {
    return {
      active: this.client.active,
      connected: this.client.connected,
      reconnectAttempts: this.reconnectAttempts,
      isManuallyDisconnected: this.isManuallyDisconnected,
      subscriptionsCount: this.subscriptions.length
    };
  }

  forceReconnect() {
    console.log('🔄 Forcing WebSocket reconnection...');
    this.disconnect();
    setTimeout(() => {
      this.connect();
    }, 1000);
  }
}