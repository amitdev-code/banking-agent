import { Logger } from '@nestjs/common';
import {
  type OnGatewayConnection,
  type OnGatewayInit,
  SubscribeMessage,
  WebSocketGateway,
  WebSocketServer,
  ConnectedSocket,
  MessageBody,
} from '@nestjs/websockets';
import type { Server, Socket } from 'socket.io';
import type { RequestHandler } from 'express';

import type {
  MessageCompleteEvent,
  SessionAwaitingApprovalEvent,
  SessionErrorEvent,
  ToolDoneEvent,
  ToolErrorEvent,
  ToolStartEvent,
} from '@banking-crm/types';

@WebSocketGateway({
  namespace: '/crm-session',
  cors: {
    origin: process.env['WEB_URL'] ?? 'http://localhost:3000',
    credentials: true,
  },
})
export class CrmSessionGateway implements OnGatewayInit, OnGatewayConnection {
  @WebSocketServer()
  private server!: Server;

  private readonly logger = new Logger(CrmSessionGateway.name);
  private sessionMiddleware?: RequestHandler;

  afterInit(server: Server): void {
    if (this.sessionMiddleware) {
      server.use((socket, next) => {
        this.sessionMiddleware!(
          socket.request as Parameters<RequestHandler>[0],
          {} as Parameters<RequestHandler>[1],
          next as Parameters<RequestHandler>[2],
        );
      });
    }
    this.logger.log('CRM Session WebSocket gateway initialized');
  }

  setSessionMiddleware(middleware: RequestHandler): void {
    this.sessionMiddleware = middleware;
  }

  handleConnection(client: Socket): void {
    const session = (client.request as { session?: { user?: { id: string } } }).session;
    if (!session?.user) {
      client.disconnect(true);
      return;
    }
    this.logger.debug(`WS client connected: ${client.id}`);
  }

  @SubscribeMessage('subscribe')
  handleSubscribe(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { sessionId: string },
  ): void {
    void client.join(`session:${data.sessionId}`);
    this.logger.debug(`Client ${client.id} subscribed to session ${data.sessionId}`);
  }

  emitToolStart(sessionId: string, event: ToolStartEvent): void {
    this.server.to(`session:${sessionId}`).emit('tool:start', event);
  }

  emitToolDone(sessionId: string, event: ToolDoneEvent): void {
    this.server.to(`session:${sessionId}`).emit('tool:done', event);
  }

  emitToolError(sessionId: string, event: ToolErrorEvent): void {
    this.server.to(`session:${sessionId}`).emit('tool:error', event);
  }

  emitMessageComplete(sessionId: string, event: MessageCompleteEvent): void {
    this.server.to(`session:${sessionId}`).emit('message:complete', event);
  }

  emitAwaitingApproval(sessionId: string, event: SessionAwaitingApprovalEvent): void {
    this.server.to(`session:${sessionId}`).emit('session:awaiting-approval', event);
  }

  emitSessionError(sessionId: string, event: SessionErrorEvent): void {
    this.server.to(`session:${sessionId}`).emit('session:error', event);
  }
}
