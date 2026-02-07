import {
  WebSocketGateway,
  WebSocketServer,
  SubscribeMessage,
  MessageBody,
  ConnectedSocket,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { OnEvent } from '@nestjs/event-emitter';
import { Logger } from '@nestjs/common';

@WebSocketGateway({ cors: { origin: '*' }, namespace: '/executions' })
export class ExecutionGateway {
  private readonly logger = new Logger(ExecutionGateway.name);

  @WebSocketServer()
  server: Server;

  @SubscribeMessage('subscribe')
  handleSubscribe(
    @MessageBody() data: { executionId: string },
    @ConnectedSocket() client: Socket,
  ) {
    client.join(`execution:${data.executionId}`);
    this.logger.log(`Client subscribed to execution ${data.executionId}`);
  }

  @SubscribeMessage('unsubscribe')
  handleUnsubscribe(
    @MessageBody() data: { executionId: string },
    @ConnectedSocket() client: Socket,
  ) {
    client.leave(`execution:${data.executionId}`);
  }

  @OnEvent('execution.started')
  handleExecutionStarted(payload: {
    executionId: string;
    workflowId: string;
  }) {
    this.server
      .to(`execution:${payload.executionId}`)
      .emit('execution:started', payload);
  }

  @OnEvent('execution.completed')
  handleExecutionCompleted(payload: { executionId: string }) {
    this.server
      .to(`execution:${payload.executionId}`)
      .emit('execution:completed', payload);
  }

  @OnEvent('execution.failed')
  handleExecutionFailed(payload: { executionId: string; error: string }) {
    this.server
      .to(`execution:${payload.executionId}`)
      .emit('execution:failed', payload);
  }

  @OnEvent('node.started')
  handleNodeStarted(payload: { executionId: string; nodeId: string }) {
    this.server
      .to(`execution:${payload.executionId}`)
      .emit('node:started', payload);
  }

  @OnEvent('node.completed')
  handleNodeCompleted(payload: {
    executionId: string;
    nodeId: string;
    output: any;
  }) {
    this.server
      .to(`execution:${payload.executionId}`)
      .emit('node:completed', payload);
  }

  @OnEvent('node.failed')
  handleNodeFailed(payload: {
    executionId: string;
    nodeId: string;
    error: string;
  }) {
    this.server
      .to(`execution:${payload.executionId}`)
      .emit('node:failed', payload);
  }
}
