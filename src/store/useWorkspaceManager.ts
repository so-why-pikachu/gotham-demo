import { useReducer, useCallback } from 'react';
import type { Workspace, WorkspaceState, WorkspaceAction, WorkspaceType } from '../types/workspace.ts';

const GLOBAL_ID = 'global-overview';

const initialState: WorkspaceState = {
  workspaces: [
    {
      id: GLOBAL_ID,
      type: 'global',
      title: 'Global Overview',
    },
  ],
  activeId: GLOBAL_ID,
};

function generateId(type: WorkspaceType, title: string): string {
  return `${type}-${title}-${Date.now()}`;
}

function workspaceReducer(state: WorkspaceState, action: WorkspaceAction): WorkspaceState {
  switch (action.type) {
    case 'OPEN': {
      const existing = state.workspaces.find(
        (w) => w.type === action.payload.type && w.title === action.payload.title
      );
      if (existing) {
        return { ...state, activeId: existing.id, workspaces: state.workspaces.map(w => w.id === existing.id ? {...w, params: {...w.params, ...action.payload.params}} : w) };
      }
      const newWorkspace: Workspace = {
        ...action.payload,
        id: action.payload.id ?? generateId(action.payload.type, action.payload.title),
      };
      return {
        workspaces: [...state.workspaces, newWorkspace],
        activeId: newWorkspace.id,
      };
    }
    case 'CLOSE': {
      const idx = state.workspaces.findIndex((w) => w.id === action.payload);
      if (idx === -1) return state;
      const nextWorkspaces = state.workspaces.filter((w) => w.id !== action.payload);
      let nextActiveId = state.activeId;
      if (state.activeId === action.payload) {
        nextActiveId = nextWorkspaces[idx - 1]?.id ?? nextWorkspaces[idx]?.id ?? null;
      }
      return { workspaces: nextWorkspaces, activeId: nextActiveId };
    }
    case 'ACTIVATE':
      return { ...state, activeId: action.payload };
    default:
      return state;
  }
}

export function useWorkspaceManager() {
  const [state, dispatch] = useReducer(workspaceReducer, initialState);

  const openWorkspace = useCallback(
    (type: WorkspaceType, title: string, params?: Record<string, unknown>) => {
      dispatch({ type: 'OPEN', payload: { type, title, params: type === 'report' && params ? {detail:true,...params} : params } });
    },
    []
  );

  const closeWorkspace = useCallback((id: string) => {
    dispatch({ type: 'CLOSE', payload: id });
  }, []);

  const activateWorkspace = useCallback((id: string) => {
    dispatch({ type: 'ACTIVATE', payload: id });
  }, []);

  const activeWorkspace = state.workspaces.find((w) => w.id === state.activeId) ?? null;

  return {
    workspaces: state.workspaces,
    activeId: state.activeId,
    activeWorkspace,
    openWorkspace,
    closeWorkspace,
    activateWorkspace,
  };
}
