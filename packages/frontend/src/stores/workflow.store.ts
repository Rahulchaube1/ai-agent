import { create } from 'zustand';
import { Node, Edge } from '@xyflow/react';

export interface WorkflowExecution {
  id: string;
  status: 'pending' | 'running' | 'completed' | 'failed' | 'cancelled';
  startedAt: string;
  completedAt?: string;
  nodeStatuses: Record<string, NodeExecutionStatus>;
  error?: string;
}

export interface NodeExecutionStatus {
  nodeId: string;
  status: 'pending' | 'running' | 'completed' | 'failed' | 'skipped';
  startedAt?: string;
  completedAt?: string;
  output?: unknown;
  error?: string;
  duration?: number;
}

export interface WorkflowVersion {
  nodes: Node[];
  edges: Edge[];
  timestamp: number;
}

interface WorkflowState {
  // Workflow metadata
  workflowId: string | null;
  workflowName: string;
  workflowDescription: string;
  isDirty: boolean;
  lastSavedAt: string | null;

  // Undo/Redo
  history: WorkflowVersion[];
  historyIndex: number;
  maxHistory: number;

  // Execution
  currentExecution: WorkflowExecution | null;
  executionHistory: WorkflowExecution[];

  // UI state
  selectedNodeId: string | null;
  nodesPanelOpen: boolean;
  configPanelOpen: boolean;
  debugMode: boolean;
  snapToGrid: boolean;
  gridSize: number;

  // Actions
  setWorkflowId: (id: string) => void;
  setWorkflowName: (name: string) => void;
  setWorkflowDescription: (description: string) => void;
  setIsDirty: (dirty: boolean) => void;
  setLastSavedAt: (timestamp: string) => void;

  pushHistory: (version: WorkflowVersion) => void;
  undo: () => WorkflowVersion | null;
  redo: () => WorkflowVersion | null;
  canUndo: () => boolean;
  canRedo: () => boolean;

  setCurrentExecution: (execution: WorkflowExecution | null) => void;
  updateNodeExecutionStatus: (nodeId: string, status: NodeExecutionStatus) => void;
  addExecutionToHistory: (execution: WorkflowExecution) => void;

  setSelectedNodeId: (id: string | null) => void;
  setNodesPanelOpen: (open: boolean) => void;
  setConfigPanelOpen: (open: boolean) => void;
  setDebugMode: (debug: boolean) => void;
  setSnapToGrid: (snap: boolean) => void;
  setGridSize: (size: number) => void;

  reset: () => void;
}

const initialState = {
  workflowId: null,
  workflowName: 'Untitled Workflow',
  workflowDescription: '',
  isDirty: false,
  lastSavedAt: null,
  history: [],
  historyIndex: -1,
  maxHistory: 50,
  currentExecution: null,
  executionHistory: [],
  selectedNodeId: null,
  nodesPanelOpen: false,
  configPanelOpen: false,
  debugMode: false,
  snapToGrid: true,
  gridSize: 16,
};

export const useWorkflowStore = create<WorkflowState>((set, get) => ({
  ...initialState,

  setWorkflowId: (id) => set({ workflowId: id }),
  setWorkflowName: (name) => set({ workflowName: name, isDirty: true }),
  setWorkflowDescription: (description) => set({ workflowDescription: description, isDirty: true }),
  setIsDirty: (dirty) => set({ isDirty: dirty }),
  setLastSavedAt: (timestamp) => set({ lastSavedAt: timestamp }),

  pushHistory: (version) => {
    const { history, historyIndex, maxHistory } = get();
    // Remove any forward history when pushing new state
    const newHistory = history.slice(0, historyIndex + 1);
    newHistory.push(version);
    // Trim history if it exceeds max
    if (newHistory.length > maxHistory) {
      newHistory.shift();
    }
    set({
      history: newHistory,
      historyIndex: newHistory.length - 1,
      isDirty: true,
    });
  },

  undo: () => {
    const { history, historyIndex } = get();
    if (historyIndex <= 0) return null;
    const newIndex = historyIndex - 1;
    set({ historyIndex: newIndex, isDirty: true });
    return history[newIndex];
  },

  redo: () => {
    const { history, historyIndex } = get();
    if (historyIndex >= history.length - 1) return null;
    const newIndex = historyIndex + 1;
    set({ historyIndex: newIndex, isDirty: true });
    return history[newIndex];
  },

  canUndo: () => get().historyIndex > 0,
  canRedo: () => get().historyIndex < get().history.length - 1,

  setCurrentExecution: (execution) => set({ currentExecution: execution }),

  updateNodeExecutionStatus: (nodeId, status) => {
    const { currentExecution } = get();
    if (!currentExecution) return;
    set({
      currentExecution: {
        ...currentExecution,
        nodeStatuses: {
          ...currentExecution.nodeStatuses,
          [nodeId]: status,
        },
      },
    });
  },

  addExecutionToHistory: (execution) => {
    set((state) => ({
      executionHistory: [execution, ...state.executionHistory].slice(0, 100),
    }));
  },

  setSelectedNodeId: (id) => set({ selectedNodeId: id }),
  setNodesPanelOpen: (open) => set({ nodesPanelOpen: open }),
  setConfigPanelOpen: (open) => set({ configPanelOpen: open }),
  setDebugMode: (debug) => set({ debugMode: debug }),
  setSnapToGrid: (snap) => set({ snapToGrid: snap }),
  setGridSize: (size) => set({ gridSize: size }),

  reset: () => set(initialState),
}));
