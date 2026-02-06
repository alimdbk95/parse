import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface User {
  id: string;
  email: string;
  name: string;
  avatar?: string;
  theme: string;
  brandColors?: string[];
  brandFont?: string;
}

interface Workspace {
  id: string;
  name: string;
  role: string;
}

interface Analysis {
  id: string;
  title: string;
  description?: string;
  createdAt: string;
  updatedAt: string;
}

interface Document {
  id: string;
  name: string;
  type: string;
  size: number;
  createdAt: string;
}

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  metadata?: any;
  createdAt: string;
}

interface AppState {
  // Auth
  user: User | null;
  token: string | null;
  isAuthenticated: boolean;

  // Workspaces
  workspaces: Workspace[];
  currentWorkspace: Workspace | null;

  // Analyses
  analyses: Analysis[];
  currentAnalysis: Analysis | null;

  // Documents
  documents: Document[];

  // Messages
  messages: Message[];

  // UI State
  sidebarOpen: boolean;
  theme: 'dark' | 'light';

  // Actions
  setUser: (user: User | null) => void;
  setToken: (token: string | null) => void;
  logout: () => void;

  setWorkspaces: (workspaces: Workspace[]) => void;
  setCurrentWorkspace: (workspace: Workspace | null) => void;

  setAnalyses: (analyses: Analysis[]) => void;
  setCurrentAnalysis: (analysis: Analysis | null) => void;
  addAnalysis: (analysis: Analysis) => void;
  updateAnalysis: (id: string, data: Partial<Analysis>) => void;
  removeAnalysis: (id: string) => void;

  setDocuments: (documents: Document[]) => void;
  addDocument: (document: Document) => void;
  removeDocument: (id: string) => void;

  setMessages: (messages: Message[]) => void;
  addMessage: (message: Message) => void;
  clearMessages: () => void;

  setSidebarOpen: (open: boolean) => void;
  toggleSidebar: () => void;
  setTheme: (theme: 'dark' | 'light') => void;
}

export const useStore = create<AppState>()(
  persist(
    (set, get) => ({
      // Initial state
      user: null,
      token: null,
      isAuthenticated: false,
      workspaces: [],
      currentWorkspace: null,
      analyses: [],
      currentAnalysis: null,
      documents: [],
      messages: [],
      sidebarOpen: true,
      theme: 'dark',

      // Auth actions
      setUser: (user) => set({ user, isAuthenticated: !!user }),
      setToken: (token) => set({ token }),
      logout: () =>
        set({
          user: null,
          token: null,
          isAuthenticated: false,
          workspaces: [],
          currentWorkspace: null,
          analyses: [],
          currentAnalysis: null,
          documents: [],
          messages: [],
        }),

      // Workspace actions
      setWorkspaces: (workspaces) => set({ workspaces }),
      setCurrentWorkspace: (workspace) => set({ currentWorkspace: workspace }),

      // Analysis actions
      setAnalyses: (analyses) => set({ analyses }),
      setCurrentAnalysis: (analysis) => set({ currentAnalysis: analysis }),
      addAnalysis: (analysis) =>
        set((state) => ({ analyses: [analysis, ...state.analyses] })),
      updateAnalysis: (id, data) =>
        set((state) => ({
          analyses: state.analyses.map((a) =>
            a.id === id ? { ...a, ...data } : a
          ),
          currentAnalysis:
            state.currentAnalysis?.id === id
              ? { ...state.currentAnalysis, ...data }
              : state.currentAnalysis,
        })),
      removeAnalysis: (id) =>
        set((state) => ({
          analyses: state.analyses.filter((a) => a.id !== id),
          currentAnalysis:
            state.currentAnalysis?.id === id ? null : state.currentAnalysis,
        })),

      // Document actions
      setDocuments: (documents) => set({ documents }),
      addDocument: (document) =>
        set((state) => ({ documents: [document, ...state.documents] })),
      removeDocument: (id) =>
        set((state) => ({
          documents: state.documents.filter((d) => d.id !== id),
        })),

      // Message actions
      setMessages: (messages) => set({ messages }),
      addMessage: (message) =>
        set((state) => ({ messages: [...state.messages, message] })),
      clearMessages: () => set({ messages: [] }),

      // UI actions
      setSidebarOpen: (open) => set({ sidebarOpen: open }),
      toggleSidebar: () => set((state) => ({ sidebarOpen: !state.sidebarOpen })),
      setTheme: (theme) => set({ theme }),
    }),
    {
      name: 'parse-storage',
      partialize: (state) => ({
        token: state.token,
        theme: state.theme,
        sidebarOpen: state.sidebarOpen,
      }),
    }
  )
);
