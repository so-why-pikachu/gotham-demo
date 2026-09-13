export type WorkspaceType = 'global' | 'mine' | 'report' | 'archive';

export interface Workspace {
  id: string;
  type: WorkspaceType;
  title: string;
  params?: Record<string, unknown>;
}

export interface WorkspaceState {
  workspaces: Workspace[];
  activeId: string | null;
}

export type WorkspaceAction =
  | { type: 'OPEN'; payload: Omit<Workspace, 'id'> & { id?: string } }
  | { type: 'CLOSE'; payload: string }
  | { type: 'ACTIVATE'; payload: string };
