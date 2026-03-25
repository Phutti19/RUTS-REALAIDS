import { Injectable, Logger } from '@nestjs/common';
import * as WebSocket from 'ws';
import * as http from 'http';
import * as jwt from 'jsonwebtoken';
import { randomUUID } from 'crypto';

// ── Types ────────────────────────────────────────────────────────────────────

interface JwtPayload {
  sub: string;
  role: 'student' | 'staff' | 'admin';
  iat: number;
  exp: number;
}

interface WsClient {
  connectionId: string;
  ws: WebSocket;
  userId: string;
  role: 'student' | 'staff' | 'admin';
  connectedAt: Date;
  isAlive: boolean;
}

interface WsMessage {
  event: string;
  data: unknown;
}

// ── WS Event names (typed constants) ─────────────────────────────────────────

export const WS_EVENTS = {
  // Incident events
  INCIDENT_NEW: 'incident:new',
  INCIDENT_STATUS_UPDATE: 'incident:status_update',
  INCIDENT_ACCEPTED: 'incident:accepted',
  // Queue events
  QUEUE_UPDATE: 'queue:update',
  // Notification events
  NOTIFICATION_NEW: 'notification:new',
  // Stock events
  STOCK_ALERT: 'stock:alert',
  // Appointment events
  APPOINTMENT_UPDATE: 'appointment:update',
} as const;

// ── Service ───────────────────────────────────────────────────────────────────

@Injectable()
export class WsService {
  private wss!: WebSocket.Server;
  private heartbeatInterval!: NodeJS.Timeout;

  // connectionId → WsClient (one user can have multiple tabs open)
  private readonly clients = new Map<string, WsClient>();

  private readonly logger = new Logger(WsService.name);

  private static readonly HEARTBEAT_INTERVAL_MS = 30_000; // 30 seconds

  // ── Initialization ──────────────────────────────────────────────────────

  /**
   * Attach the WebSocket server to the existing NestJS HTTP server.
   * Called from main.ts after app.listen().
   */
  init(server: http.Server): void {
    this.wss = new WebSocket.Server({ server });

    this.wss.on('connection', (ws: WebSocket, req: http.IncomingMessage) => {
      this.handleConnection(ws, req);
    });

    // ── Heartbeat: ping every 30s, terminate stale connections ──
    this.heartbeatInterval = setInterval(() => {
      this.clients.forEach((client, connectionId) => {
        if (!client.isAlive) {
          this.logger.log(
            `[heartbeat] stale connection terminated userId=${client.userId} connId=${connectionId}`,
          );
          client.ws.terminate();
          this.clients.delete(connectionId);
          return;
        }
        client.isAlive = false;
        client.ws.ping();
      });
    }, WsService.HEARTBEAT_INTERVAL_MS);

    this.wss.on('close', () => {
      clearInterval(this.heartbeatInterval);
    });

    this.logger.log('WebSocket server attached to HTTP server (heartbeat: 30s)');
  }

  // ── Connection handling ─────────────────────────────────────────────────

  private handleConnection(ws: WebSocket, req: http.IncomingMessage): void {
    // Validate origin
    const origin = req.headers.origin;
    const allowedOrigins = (process.env.CORS_ORIGIN ?? '').split(',').map((o) => o.trim()).filter(Boolean);
    if (allowedOrigins.length > 0 && origin && !allowedOrigins.includes(origin)) {
      ws.close(1008, 'Origin not allowed');
      return;
    }

    // Extract JWT from ?token= query param
    const url = new URL(req.url ?? '/', `http://${req.headers.host}`);
    const token = url.searchParams.get('token');

    if (!token) {
      ws.close(1008, 'Missing token');
      return;
    }

    if (!process.env.JWT_SECRET) {
      this.logger.error('JWT_SECRET is not configured');
      ws.close(1011, 'Server misconfigured');
      return;
    }

    let payload: JwtPayload;
    try {
      payload = jwt.verify(token, process.env.JWT_SECRET) as JwtPayload;
    } catch {
      ws.close(1008, 'Invalid or expired token');
      return;
    }

    const connectionId = randomUUID();
    const client: WsClient = {
      connectionId,
      ws,
      userId: payload.sub,
      role: payload.role,
      connectedAt: new Date(),
      isAlive: true,
    };

    this.clients.set(connectionId, client);
    this.logger.log(
      `[connect] userId=${payload.sub} role=${payload.role} connId=${connectionId} | total=${this.clients.size}`,
    );

    // Register WS event listeners
    ws.on('pong', () => { client.isAlive = true; });
    ws.on('message', (raw) => this.handleMessage(connectionId, raw));
    ws.on('close', () => this.handleDisconnect(connectionId));
    ws.on('error', (err) =>
      this.logger.error(`WS error connId=${connectionId}: ${err.message}`),
    );

    // Acknowledge connection
    this.send(ws, 'connected', { userId: payload.sub, connectionId });
  }

  private handleMessage(connectionId: string, raw: WebSocket.RawData): void {
    let msg: WsMessage;
    try {
      msg = JSON.parse(raw.toString()) as WsMessage;
    } catch {
      return; // Ignore malformed messages
    }

    if (msg.event === 'ping') {
      this.send(this.clients.get(connectionId)!.ws, 'pong', { ts: Date.now() });
    }
  }

  private handleDisconnect(connectionId: string): void {
    const client = this.clients.get(connectionId);
    if (client) {
      this.logger.log(
        `[disconnect] userId=${client.userId} connId=${connectionId} | total=${this.clients.size - 1}`,
      );
      this.clients.delete(connectionId);
    }
  }

  // ── Primitive send ──────────────────────────────────────────────────────

  private send(ws: WebSocket, event: string, data: unknown): void {
    if (ws.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify({ event, data }));
    }
  }

  // ── Public broadcast methods ────────────────────────────────────────────

  /** Send an event to a specific user (all their open tabs). */
  sendToUser(userId: string, event: string, data: unknown): void {
    this.clients.forEach((client) => {
      if (client.userId === userId) {
        this.send(client.ws, event, data);
      }
    });
  }

  /** Broadcast to all connected staff/admin users. */
  broadcastToStaff(event: string, data: unknown): void {
    this.clients.forEach((client) => {
      if (client.role === 'staff' || client.role === 'admin') {
        this.send(client.ws, event, data);
      }
    });
  }

  /** Broadcast to all connected users. */
  broadcastToAll(event: string, data: unknown): void {
    this.clients.forEach((client) => {
      this.send(client.ws, event, data);
    });
  }

  // ── Domain-specific event helpers ───────────────────────────────────────

  /** New emergency incident — notify all staff. */
  notifyNewIncident(incidentData: unknown): void {
    this.broadcastToStaff(WS_EVENTS.INCIDENT_NEW, incidentData);
  }

  /** Incident status changed — notify all staff + the original reporter. */
  notifyIncidentStatusUpdate(incidentData: unknown, reporterId: string): void {
    this.broadcastToStaff(WS_EVENTS.INCIDENT_STATUS_UPDATE, incidentData);
    this.sendToUser(reporterId, WS_EVENTS.INCIDENT_STATUS_UPDATE, incidentData);
  }

  /** Incident accepted by a responder — notify the reporter only. */
  notifyIncidentAccepted(incidentData: unknown, reporterId: string): void {
    this.sendToUser(reporterId, WS_EVENTS.INCIDENT_ACCEPTED, incidentData);
  }

  /** Patient queue changed — notify all staff. */
  notifyQueueUpdate(queueData: unknown): void {
    this.broadcastToStaff(WS_EVENTS.QUEUE_UPDATE, queueData);
  }

  /** New notification for a user — send to that user only. */
  notifyUser(userId: string, notificationData: unknown): void {
    this.sendToUser(userId, WS_EVENTS.NOTIFICATION_NEW, notificationData);
  }

  /** Medicine stock below threshold — notify all staff. */
  notifyStockAlert(stockData: unknown): void {
    this.broadcastToStaff(WS_EVENTS.STOCK_ALERT, stockData);
  }

  /** Appointment created/updated/cancelled/rescheduled — notify all staff + patient. */
  notifyAppointmentUpdate(appointmentData: unknown, patientId: string): void {
    this.broadcastToStaff(WS_EVENTS.APPOINTMENT_UPDATE, appointmentData);
    this.sendToUser(patientId, WS_EVENTS.APPOINTMENT_UPDATE, appointmentData);
  }

  // ── Stats ───────────────────────────────────────────────────────────────

  getConnectedCount(): number {
    return this.clients.size;
  }
}
