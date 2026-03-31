"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.WebSocketService = void 0;
const events_1 = require("events");
const ws_1 = __importDefault(require("ws"));
/**
 * Real WebSocket service for Helix VS Code extension.
 *
 * Connects to the FastAPI backend's standard WebSocket endpoints:
 * - /ws/coordination?token=TOKEN  (authenticated, real-time UCF data)
 * - /ws                             (legacy, unauthenticated)
 *
 * All messages are JSON-encoded with a `type` field for routing.
 */
class WebSocketService extends events_1.EventEmitter {
    constructor() {
        super();
        this.socket = null;
        this.endpoint = 'ws://localhost:8000/ws/coordination';
        this.isConnected = false;
        this.reconnectAttempts = 0;
        this.maxReconnectAttempts = 5;
        this.reconnectDelay = 1000;
        this.authToken = '';
        this.pingInterval = null;
    }
    setEndpoint(endpoint) {
        // Convert http(s) to ws(s) if needed
        this.endpoint = endpoint
            .replace(/^http:/, 'ws:')
            .replace(/^https:/, 'wss:');
        // Ensure path ends with /ws/coordination
        if (!this.endpoint.includes('/ws')) {
            this.endpoint = this.endpoint.replace(/\/$/, '') + '/ws/coordination';
        }
    }
    setAuthToken(token) {
        this.authToken = token;
    }
    async connect() {
        return new Promise((resolve, reject) => {
            try {
                if (this.socket) {
                    this.disconnect();
                }
                // Build URL with auth token as query param (matches backend expectation)
                const url = this.authToken
                    ? `${this.endpoint}?token=${encodeURIComponent(this.authToken)}`
                    : this.endpoint;
                this.socket = new ws_1.default(url);
                this.socket.on('open', () => {
                    this.isConnected = true;
                    this.reconnectAttempts = 0;
                    this.emit('connected');
                    this.startPing();
                    resolve();
                });
                this.socket.on('message', (raw) => {
                    try {
                        const msg = JSON.parse(raw.toString());
                        const type = msg.type || 'message';
                        // Emit typed event (coordination_update, agent_status, etc.)
                        this.emit(type, msg.data ?? msg);
                        // Also emit generic 'message' for catch-all listeners
                        if (type !== 'message') {
                            this.emit('message', msg);
                        }
                    }
                    catch {
                        // Non-JSON payload — emit as raw message
                        this.emit('message', { type: 'raw', data: raw.toString() });
                    }
                });
                this.socket.on('close', (code, reason) => {
                    this.isConnected = false;
                    this.stopPing();
                    this.emit('disconnected', reason.toString() || `code ${code}`);
                    this.handleReconnect();
                });
                this.socket.on('error', (err) => {
                    this.emit('error', err);
                    // If still connecting, reject the promise
                    if (!this.isConnected) {
                        reject(err);
                    }
                });
            }
            catch (error) {
                reject(error);
            }
        });
    }
    disconnect() {
        this.stopPing();
        if (this.socket) {
            try {
                this.socket.close(1000, 'Client disconnect');
            }
            catch {
                // Ignore close errors on already-closed sockets
            }
            this.socket = null;
        }
        this.isConnected = false;
    }
    isConnectedToServer() {
        return this.isConnected && this.socket?.readyState === ws_1.default.OPEN;
    }
    send(type, data) {
        if (this.isConnectedToServer() && this.socket) {
            this.socket.send(JSON.stringify({ type, data, timestamp: new Date().toISOString() }));
        }
    }
    joinRoom(roomId) {
        this.send('join_room', { room: roomId });
    }
    leaveRoom(roomId) {
        this.send('leave_room', { room: roomId });
    }
    startPing() {
        this.stopPing();
        // Send ping every 30s to keep connection alive through proxies/load balancers
        this.pingInterval = setInterval(() => {
            if (this.isConnectedToServer() && this.socket) {
                this.socket.ping();
            }
        }, 30000);
    }
    stopPing() {
        if (this.pingInterval) {
            clearInterval(this.pingInterval);
            this.pingInterval = null;
        }
    }
    handleReconnect() {
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
    async connectToAgent(agentId) {
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
            const onConnected = (data) => {
                clearTimeout(timeout);
                this.off('agent_connection_error', onError);
                resolve(data);
            };
            const onError = (error) => {
                clearTimeout(timeout);
                this.off('agent_connected', onConnected);
                reject(new Error(typeof error === 'string'
                    ? error
                    : error?.message || 'Connection failed'));
            };
            this.once('agent_connected', onConnected);
            this.once('agent_connection_error', onError);
            this.send('connect_agent', { agentId });
        });
    }
    async disconnectAgent(agentId) {
        if (!this.isConnectedToServer()) {
            throw new Error('WebSocket not connected');
        }
        this.send('disconnect_agent', { agentId });
    }
    async sendAgentMessage(agentId, message) {
        if (!this.isConnectedToServer()) {
            throw new Error('WebSocket not connected');
        }
        this.send('agent_message', { agentId, message });
    }
    async streamAgentOutput(agentId, callback) {
        const handler = (data) => {
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
    startCoordinationMonitoring() {
        this.send('start_coordination_monitoring', {});
    }
    stopCoordinationMonitoring() {
        this.send('stop_coordination_monitoring', {});
    }
    async executeWorkflow(workflowId, context) {
        if (!this.isConnectedToServer()) {
            throw new Error('WebSocket not connected');
        }
        this.send('execute_workflow', { workflowId, context });
    }
    subscribe(event, callback) {
        this.on(event, callback);
    }
    unsubscribe(event, callback) {
        if (callback) {
            this.off(event, callback);
        }
        else {
            this.removeAllListeners(event);
        }
    }
}
exports.WebSocketService = WebSocketService;
//# sourceMappingURL=websocketService.js.map