import { io, Socket } from 'socket.io-client';
import { toast } from "@/components/ui/use-toast";
import { API_CONFIG } from '@/config/api';

class WebSocketService {
  private socket: Socket | null = null;
  private static instance: WebSocketService;
  private reconnectAttempts: number = 0;
  private maxReconnectAttempts: number = 5;
  private reconnectDelay: number = 5000;
  private reconnectTimer: NodeJS.Timeout | null = null;
  private subscriptions: Map<string, Set<(data: any) => void>> = new Map();
  private isConnecting: boolean = false;
  private isConnected: boolean = false;

  private constructor() {
    this.initializeSocket();
  }

  public static getInstance(): WebSocketService {
    if (!WebSocketService.instance) {
      WebSocketService.instance = new WebSocketService();
    }
    return WebSocketService.instance;
  }

  private initializeSocket() {
    if (this.isConnecting || this.isConnected) return;
    
    this.isConnecting = true;
    console.log('Initializing WebSocket connection...');

    try {
      this.socket = io(API_CONFIG.WS_URL, {
        reconnection: true,
        reconnectionAttempts: this.maxReconnectAttempts,
        reconnectionDelay: this.reconnectDelay,
        timeout: 20000,
        transports: ['websocket'],
      });

      this.setupEventHandlers();
    } catch (error) {
      console.error('Failed to initialize socket:', error);
      this.handleConnectionError();
    }
  }

  private setupEventHandlers() {
    if (!this.socket) return;

    this.socket.on('connect', () => {
      console.log('WebSocket Connected Successfully');
      this.isConnecting = false;
      this.isConnected = true;
      this.reconnectAttempts = 0;
      
      if (this.reconnectTimer) {
        clearTimeout(this.reconnectTimer);
        this.reconnectTimer = null;
      }

      // Request initial data upon connection
      this.socket.emit('request-metrics');
      this.socket.emit('request-service-health');

      toast({
        title: "Connected to monitoring service",
        description: "Real-time updates enabled",
      });
    });

    this.socket.on('disconnect', (reason) => {
      console.log('WebSocket Disconnected:', reason);
      this.isConnected = false;
      this.isConnecting = false;
      this.handleConnectionError();
    });

    this.socket.on('connect_error', (error) => {
      console.error('Connection Error:', error);
      this.isConnected = false;
      this.isConnecting = false;
      this.handleConnectionError();
    });

    this.setupMetricHandlers();
  }

  private setupMetricHandlers() {
    if (!this.socket) return;

    const handlers = {
      'metrics-update': 'Received metrics update',
      'new-alert': 'Received new alert',
      'ai-prediction': 'Received AI prediction',
      'anomaly-detected': 'Anomaly detected',
      'service-health': 'Service health update'
    };

    Object.entries(handlers).forEach(([event, logMessage]) => {
      this.socket?.on(event, (data) => {
        console.log(logMessage + ':', data);
        this.notifySubscribers(event, data);
      });
    });
  }

  private handleConnectionError() {
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
    }

    if (this.reconnectAttempts >= this.maxReconnectAttempts) {
      toast({
        title: "Connection Error",
        description: "Failed to connect to monitoring service. Please refresh the page.",
        variant: "destructive",
      });
      return;
    }

    this.reconnectAttempts++;
    const delay = Math.min(1000 * Math.pow(2, this.reconnectAttempts), 30000);
    
    console.log(`Attempting to reconnect (${this.reconnectAttempts}/${this.maxReconnectAttempts})...`);
    
    this.reconnectTimer = setTimeout(() => {
      console.log(`Reconnecting after ${delay}ms delay...`);
      this.socket?.close();
      this.socket = null;
      this.initializeSocket();
    }, delay);

    if (this.reconnectAttempts > 1) {
      toast({
        title: "Reconnecting",
        description: `Attempt ${this.reconnectAttempts} of ${this.maxReconnectAttempts}`,
      });
    }
  }

  private notifySubscribers(event: string, data: any) {
    const subscribers = this.subscriptions.get(event);
    if (subscribers) {
      subscribers.forEach(callback => callback(data));
    }
  }

  public subscribe(event: string, callback: (data: any) => void) {
    if (!this.subscriptions.has(event)) {
      this.subscriptions.set(event, new Set());
    }
    this.subscriptions.get(event)?.add(callback);

    // If disconnected, try to reconnect
    if (!this.isConnected && !this.isConnecting) {
      this.initializeSocket();
    }

    // Request initial data for new subscribers
    if (this.isConnected) {
      switch (event) {
        case 'metrics-update':
          this.socket?.emit('request-metrics');
          break;
        case 'service-health':
          this.socket?.emit('request-service-health');
          break;
      }
    }
  }

  public unsubscribe(event: string, callback: (data: any) => void) {
    this.subscriptions.get(event)?.delete(callback);
  }

  public disconnect() {
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }
    
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
    }
    
    this.isConnecting = false;
    this.isConnected = false;
    this.subscriptions.clear();
  }

  // Convenience methods for specific subscriptions
  public subscribeToMetrics(callback: (data: any) => void) {
    this.subscribe('metrics-update', callback);
  }

  public subscribeToAlerts(callback: (data: any) => void) {
    this.subscribe('new-alert', callback);
  }

  public subscribeToPipeline(callback: (data: any) => void) {
    this.subscribe('pipeline-update', callback);
  }

  public subscribeToAnomalies(callback: (data: any) => void) {
    this.subscribe('anomaly-detected', callback);
  }

  public subscribeToAIPredictions(callback: (data: any) => void) {
    this.subscribe('ai-prediction', callback);
  }

  public subscribeToServiceHealth(callback: (data: any) => void) {
    this.subscribe('service-health', callback);
  }
}

export default WebSocketService;