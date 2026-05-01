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
  WorkflowCompleteEvent,
  WorkflowErrorEvent,
  WorkflowStepEvent,
} from '@banking-crm/types';

@WebSocketGateway({
  namespace: '/crm',
  cors: {
    origin: process.env['WEB_URL'] ?? 'http://localhost:3000',
    credentials: true,
  },
})
export class CrmGateway implements OnGatewayInit, OnGatewayConnection {
  @WebSocketServer()
  private server!: Server;

  private readonly logger = new Logger(CrmGateway.name);
  private sessionMiddleware?: RequestHandler;

  afterInit(server: Server): void {
    if (this.sessionMiddleware) {
      server.use((socket, next) => {
        this.sessionMiddleware!(socket.request as Parameters<RequestHandler>[0], {} as Parameters<RequestHandler>[1], next as Parameters<RequestHandler>[2]);
      });
    }
    this.logger.log('CRM WebSocket gateway initialized');
  }

  setSessionMiddleware(middleware: RequestHandler): void {
    this.sessionMiddleware = middleware;
  }

  handleConnection(client: Socket): void {
    const session = (client.request as { session?: { user?: { id: string } } }).session;
    if (!session?.user) {
      this.logger.warn(`Unauthenticated WS connection rejected: ${client.id}`);
      client.disconnect(true);
      return;
    }
    this.logger.debug(`WS client connected: ${client.id}`);
  }

  @SubscribeMessage('subscribe')
  handleSubscribe(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { runId: string },
  ): void {
    void client.join(`run:${data.runId}`);
    this.logger.debug(`Client ${client.id} subscribed to run ${data.runId}`);
  }

  emitStepUpdate(runId: string, event: WorkflowStepEvent): void {
    this.server.to(`run:${runId}`).emit('step:update', event);
  }

  emitRunComplete(runId: string, event: WorkflowCompleteEvent): void {
    this.server.to(`run:${runId}`).emit('run:complete', event);
  }

  emitRunError(runId: string, event: WorkflowErrorEvent): void {
    this.server.to(`run:${runId}`).emit('run:error', event);
  }
}
