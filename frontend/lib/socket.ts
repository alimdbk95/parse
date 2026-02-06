import { io, Socket } from 'socket.io-client';

const SOCKET_URL = process.env.NEXT_PUBLIC_SOCKET_URL || 'http://localhost:3001';

class SocketService {
  private socket: Socket | null = null;
  private listeners: Map<string, Set<Function>> = new Map();

  connect() {
    if (this.socket?.connected) return;

    this.socket = io(SOCKET_URL, {
      autoConnect: true,
      reconnection: true,
      reconnectionAttempts: 5,
      reconnectionDelay: 1000,
    });

    this.socket.on('connect', () => {
      console.log('Socket connected:', this.socket?.id);
    });

    this.socket.on('disconnect', () => {
      console.log('Socket disconnected');
    });

    this.socket.on('connect_error', (error) => {
      console.error('Socket connection error:', error);
    });

    // Re-register all listeners
    this.listeners.forEach((callbacks, event) => {
      callbacks.forEach((callback) => {
        this.socket?.on(event, callback as any);
      });
    });
  }

  disconnect() {
    this.socket?.disconnect();
    this.socket = null;
  }

  joinWorkspace(workspaceId: string) {
    this.socket?.emit('join-workspace', workspaceId);
  }

  leaveWorkspace(workspaceId: string) {
    this.socket?.emit('leave-workspace', workspaceId);
  }

  joinAnalysis(analysisId: string) {
    this.socket?.emit('join-analysis', analysisId);
  }

  leaveAnalysis(analysisId: string) {
    this.socket?.emit('leave-analysis', analysisId);
  }

  emitUserActive(data: { workspaceId: string; userId: string; userName: string }) {
    this.socket?.emit('user-active', data);
  }

  on(event: string, callback: Function) {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, new Set());
    }
    this.listeners.get(event)?.add(callback);
    this.socket?.on(event, callback as any);
  }

  off(event: string, callback: Function) {
    this.listeners.get(event)?.delete(callback);
    this.socket?.off(event, callback as any);
  }

  emit(event: string, data: any) {
    this.socket?.emit(event, data);
  }
}

export const socketService = new SocketService();

// Event types for TypeScript
export interface SocketEvents {
  // Workspace events
  'document-uploaded': { document: any; uploadedBy: any };
  'document-deleted': { documentId: string; deletedBy: any };
  'analysis-created': { analysis: any; createdBy: any };
  'member-added': { member: any; addedBy: any };
  'member-joined': { member: any };
  'member-removed': { userId: string; removedBy: any };

  // Analysis events
  'new-message': { message: any; chart?: any };
  'document-added': { document: any };

  // Chart events
  'chart-created': { chart: any; createdBy: any };
  'chart-updated': { chart: any; updatedBy: any };
  'chart-deleted': { chartId: string; deletedBy: any };

  // Presence events
  'user-presence': { type: 'active' | 'inactive'; userId: string; userName: string };
}
