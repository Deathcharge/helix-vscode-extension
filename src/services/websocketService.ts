import { EventEmitter } from 'events';
import WebSocket from 'ws';

/**
 * Real WebSocket service for Helix VS Code extension.
 *
 * Connects to the FastAPI backend's standard WebSocket endpoints:
 * - /ws/coordination?token=TOKEN  (authenticated, real-time UCF data)
 * - /ws                             (legacy, unauthenticated)
 *
 * All messages are JSON-encoded with a `type` field for routing.
 */
export class WebSocketService extends EventEmitter {
  private socket: WebSocket | null = null;
  private endpoint: string = 'ws://localhost:8000/ws/coordination';
  private isConnected: boolean = false;
  private reconnectAttempts: number = 0;
  private maxReconnectAttempts: number = 5;
  private reconnectDelay: number = 1000;
  private authToken: string = '';
  private pingInterval: ReturnType<typeof setInterval> | null = null;

  constructor() {
    super();
  }

  setEndpoint(endpoint: string): void {
    // Convert http(s) to ws(s) if needed
    this.endpoint = endpoint
      .replace(/^http:/, 'ws:')
      .replace(/^https:/, 'wss:');
    // Ensure path ends with /ws/coordination
    if (!this.endpoint.includes('/ws')) {
      this.endpoint = this.endpoint.replace(/\/$/, '') + '/ws/coordination';
    }
  }

  setAuthToken(token: string): void {
    this.authToken = token;
  }

  async connect(): Promise<void> {
    return new Promise((resolve, reject) => {
      try {
        if (this.socket) {
          this.disconnect();
        }

        // Build URL with auth token as query param (matches backend expectation)
        const url = this.authToken
          ? `${this.endpoint}?token=${encodeURIComponent(this.authToken)}`
          : this.endpoint;

        this.socket = new WebSocket(url);

        this.socket.on('open', () => {
          this.isConnected = true;
          this.reconnectAttempts = 0;
          this.emit('connected');
          this.startPing();
          resolve();
        });

        this.socket.on('message', (raw: WebSocket.Data) => {
          try {
            const msg = JSON.parse(raw.toString());
            const type: string = msg.type || 'message';
            // Emit typed event (coordination_update, agent_status, etc.)
            this.emit(type, msg.data ?? msg);
            // Also emit generic 'message' for catch-all listeners
            if (type !== 'message') {
              this.emit('message', msg);
            }
          } catch {
            // Non-JSON payload — emit as raw message
            this.emit('message', { type: 'raw', data: raw.toString() });
          }
        });

        this.socket.on('close', (code: number, reason: Buffer) => {
          this.isConnected = false;
          this.stopPing();
          this.emit('disconnected', reason.toString() || `code ${code}`);
          this.handleReconnect();
        });

        this.socket.on('error', (err: Error) => {
          this.emit('error', err);
          // If still connecting, reject the promise
          if (!this.isConnected) {
            reject(err);
          }
        });
      } catch (error) {
        reject(error);
      }
    });
  }

  disconnect(): void {
    this.stopPing();
    if (this.socket) {
      try {
        this.socket.close(1000, 'Client disconnect');
      } catch {
        // Ignore close errors on already-closed sockets
      }
      this.socket = null;
    }
    this.isConnected = false;
  }

  isConnectedToServer(): boolean {
    return this.isConnected && this.socket?.readyState === WebSocket.OPEN;
  }

  send(type: string, data: any): void {
    if (this.isConnectedToServer() && this.socket) {
      this.socket.send(
        JSON.stringify({ type, data, timestamp: new Date().toISOString() })
      );
    }
  }

  joinRoom(roomId: string): void {
    this.send('join_room', { room: roomId });
  }

  leaveRoom(roomId: string): void {
    this.send('leave_room', { room: roomId });
  }

  private startPing(): void {
    this.stopPing();
    // Send ping every 30s to keep connection alive through proxies/load balancers
    this.pingInterval = setInterval(() => {
      if (this.isConnectedToServer() && this.socket) {
        this.socket.ping();
      }
    }, 30000);
  }

  private stopPing(): void {
    if (this.pingInterval) {
      clearInterval(this.pingInterval);
      this.pingInterval = null;
    }
  }

  private handleReconnect(): void {
    if (this.reconnectAttempts >= this.maxReconnectAttempts) {
      this.emit('reconnect_failed');
      return;
    }

    this.reconnectAttempts++;
    const delay = this.reconnectDelay * Math.pow(2, this.reconnectAttempts - 1);

    setTimeout(() => {
      this.connect().catch(() => {
        this.handleReconnect();
      });
    }, delay);
  }

  async connectToAgent(agentId: string): Promise<any> {
    return new Promise((resolve, reject) => {
      if (!this.isConnectedToServer()) {
        reject(new Error('WebSocket not connected'));
        return;
      }

      const timeout = setTimeout(() => {
        this.off('agent_connected', onConnected);
        this.off('agent_connection_error', onError);
        reject(new Error('Agent connection timeout'));
      }, 10000);

      const onConnected = (data: any) => {
        clearTimeout(timeout);
        this.off('agent_connection_error', onError);
        resolve(data);
      };

      const onError = (error: any) => {
        clearTimeout(timeout);
        this.off('agent_connected', onConnected);
        reject(
          new Error(
            typeof error === 'string'
              ? error
              : error?.message || 'Connection failed'
          )
        );
      };

      this.once('agent_connected', onConnected);
      this.once('agent_connection_error', onError);
      this.send('connect_agent', { agentId });
    });
  }

  async disconnectAgent(agentId: string): Promise<void> {
    if (!this.isConnectedToServer()) {
      throw new Error('WebSocket not connected');
    }
    this.send('disconnect_agent', { agentId });
  }

  async sendAgentMessage(agentId: string, message: string): Promise<void> {
    if (!this.isConnectedToServer()) {
      throw new Error('WebSocket not connected');
    }
    this.send('agent_message', { agentId, message });
  }

  async streamAgentOutput(
    agentId: string,
    callback: (data: any) => void
  ): Promise<() => void> {
    const handler = (data: any) => {
      if (!agentId || data?.agentId === agentId) {
        callback(data);
      }
    };

    this.on('agent_output', handler);

    // Return cleanup function instead of auto-timeout
    return () => {
      this.off('agent_output', handler);
    };
  }

  startCoordinationMonitoring(): void {
    this.send('start_coordination_monitoring', {});
  }

  stopCoordinationMonitoring(): void {
    this.send('stop_coordination_monitoring', {});
  }

  async executeWorkflow(workflowId: string, context: any): Promise<void> {
    if (!this.isConnectedToServer()) {
      throw new Error('WebSocket not connected');
    }
    this.send('execute_workflow', { workflowId, context });
  }

  subscribe(event: string, callback: (...args: any[]) => void): void {
    this.on(event, callback);
  }

  unsubscribe(event: string, callback?: (...args: any[]) => void): void {
    if (callback) {
      this.off(event, callback);
    } else {
      this.removeAllListeners(event);
    }
  }
}
