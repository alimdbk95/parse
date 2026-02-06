'use client';

import { createContext, useContext, useEffect, ReactNode } from 'react';
import { socketService } from '@/lib/socket';
import { useStore } from '@/lib/store';

interface SocketContextType {
  joinWorkspace: (workspaceId: string) => void;
  leaveWorkspace: (workspaceId: string) => void;
  joinAnalysis: (analysisId: string) => void;
  leaveAnalysis: (analysisId: string) => void;
  on: (event: string, callback: Function) => void;
  off: (event: string, callback: Function) => void;
}

const SocketContext = createContext<SocketContextType | null>(null);

export function SocketProvider({ children }: { children: ReactNode }) {
  const { isAuthenticated, user, currentWorkspace } = useStore();

  useEffect(() => {
    if (isAuthenticated) {
      socketService.connect();

      // Join current workspace if available
      if (currentWorkspace) {
        socketService.joinWorkspace(currentWorkspace.id);

        // Emit user presence
        if (user) {
          socketService.emitUserActive({
            workspaceId: currentWorkspace.id,
            userId: user.id,
            userName: user.name,
          });
        }
      }

      return () => {
        if (currentWorkspace) {
          socketService.leaveWorkspace(currentWorkspace.id);
        }
        socketService.disconnect();
      };
    }
  }, [isAuthenticated, currentWorkspace, user]);

  const value: SocketContextType = {
    joinWorkspace: (workspaceId) => socketService.joinWorkspace(workspaceId),
    leaveWorkspace: (workspaceId) => socketService.leaveWorkspace(workspaceId),
    joinAnalysis: (analysisId) => socketService.joinAnalysis(analysisId),
    leaveAnalysis: (analysisId) => socketService.leaveAnalysis(analysisId),
    on: (event, callback) => socketService.on(event, callback),
    off: (event, callback) => socketService.off(event, callback),
  };

  return (
    <SocketContext.Provider value={value}>{children}</SocketContext.Provider>
  );
}

export function useSocket() {
  const context = useContext(SocketContext);
  if (!context) {
    throw new Error('useSocket must be used within a SocketProvider');
  }
  return context;
}
