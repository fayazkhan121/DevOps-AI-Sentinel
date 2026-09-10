import { io, Socket } from 'socket.io-client';
import { getToken } from '@/lib/apiClient';
import { API_CONFIG } from '@/config/api';

type Handler = (data: unknown) => void;

class WebSocketService {
  private socket: Socket | null = null;
  private static instance: WebSocketService;
  private subscriptions = new Map<string, Set<Handler>>();
  private isConnected = false;

  static getInstance(): WebSocketService {
    if (!WebSocketService.instance) {
      WebSocketService.instance = new WebSocketService();
    }
    return WebSocketService.instance;
  }

  private initializeSocket() {
    const token = getToken();
    if (!token || this.socket) return;
    this.socket = io(API_CONFIG.WS_URL || undefined, {
      path: '/socket.io',
      auth: { token },
      transports: ['websocket', 'polling'],
    });
    this.socket.on('connect', () => {
      this.isConnected = true;
      this.socket?.emit('request-metrics');
    });
    this.socket.on('disconnect', () => {
      this.isConnected = false;
    });
    ['metrics-update', 'new-alert', 'ai-prediction', 'anomaly-detected', 'service-health', 'pipeline-update'].forEach((event) => {
      this.socket?.on(event, (data: unknown) => this.notify(event, data));
    });
  }

  private notify(event: string, data: unknown) {
    this.subscriptions.get(event)?.forEach((cb) => cb(data));
  }

  public subscribe(event: string, callback: Handler) {
    if (!this.subscriptions.has(event)) this.subscriptions.set(event, new Set());
    this.subscriptions.get(event)!.add(callback);
    if (!this.socket) this.initializeSocket();
  }

  public unsubscribe(event: string, callback: Handler) {
    this.subscriptions.get(event)?.delete(callback);
  }

  public disconnect() {
    this.socket?.disconnect();
    this.socket = null;
    this.isConnected = false;
  }

  public subscribeToMetrics(callback: Handler) { this.subscribe('metrics-update', callback); }
  public subscribeToAlerts(callback: Handler) { this.subscribe('new-alert', callback); }
  public subscribeToPipeline(callback: Handler) { this.subscribe('pipeline-update', callback); }
  public subscribeToAnomalies(callback: Handler) { this.subscribe('anomaly-detected', callback); }
  public subscribeToAIPredictions(callback: Handler) { this.subscribe('ai-prediction', callback); }
  public subscribeToServiceHealth(callback: Handler) { this.subscribe('service-health', callback); }
}

export default WebSocketService;
