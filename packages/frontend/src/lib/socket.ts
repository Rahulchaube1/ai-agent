import { io, type Socket } from 'socket.io-client';

type ExecutionUpdateHandler = (data: {
  executionId: string;
  status: string;
  nodeId?: string;
  output?: unknown;
  error?: string;
  progress?: number;
}) => void;

type WorkflowEventHandler = (data: {
  workflowId: string;
  event: string;
  payload?: unknown;
}) => void;

type ConnectionHandler = () => void;

let socket: Socket | null = null;

export function getSocket(): Socket {
  if (!socket) {
    const token = localStorage.getItem('flowforge_token');

    socket = io({
      path: '/socket.io',
      auth: {
        token,
      },
      autoConnect: false,
      reconnection: true,
      reconnectionAttempts: 10,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 5000,
    });

    socket.on('connect', () => {
      console.log('[Socket] Connected:', socket?.id);
    });

    socket.on('disconnect', (reason) => {
      console.log('[Socket] Disconnected:', reason);
    });

    socket.on('connect_error', (error) => {
      console.error('[Socket] Connection error:', error.message);
    });
  }

  return socket;
}

export function connectSocket(): void {
  const s = getSocket();
  if (!s.connected) {
    // Refresh the auth token before connecting
    const token = localStorage.getItem('flowforge_token');
    s.auth = { token };
    s.connect();
  }
}

export function disconnectSocket(): void {
  if (socket?.connected) {
    socket.disconnect();
  }
}

export function subscribeToExecution(
  executionId: string,
  onUpdate: ExecutionUpdateHandler,
): () => void {
  const s = getSocket();

  s.emit('execution:subscribe', { executionId });

  const eventName = `execution:${executionId}:update`;
  s.on(eventName, onUpdate);

  // Return unsubscribe function
  return () => {
    s.emit('execution:unsubscribe', { executionId });
    s.off(eventName, onUpdate);
  };
}

export function subscribeToWorkflow(
  workflowId: string,
  onEvent: WorkflowEventHandler,
): () => void {
  const s = getSocket();

  s.emit('workflow:subscribe', { workflowId });

  const eventName = `workflow:${workflowId}:event`;
  s.on(eventName, onEvent);

  // Return unsubscribe function
  return () => {
    s.emit('workflow:unsubscribe', { workflowId });
    s.off(eventName, onEvent);
  };
}

export function onConnect(handler: ConnectionHandler): () => void {
  const s = getSocket();
  s.on('connect', handler);
  return () => {
    s.off('connect', handler);
  };
}

export function onDisconnect(handler: ConnectionHandler): () => void {
  const s = getSocket();
  s.on('disconnect', handler);
  return () => {
    s.off('disconnect', handler);
  };
}

export default {
  getSocket,
  connectSocket,
  disconnectSocket,
  subscribeToExecution,
  subscribeToWorkflow,
  onConnect,
  onDisconnect,
};
