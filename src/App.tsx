import { useWorkspaceManager } from './store/useWorkspaceManager';
import TopBar from './components/TopBar';
import GlobalOverview from './components/GlobalOverview';
import MineWorkspace from './components/MineWorkspace';
import ReportWorkspace from './components/ReportWorkspace';
import ArchiveWorkspace from './components/ArchiveWorkspace';
import './App.css';
import { BusinessProvider, BusinessStatus } from './store/BusinessProvider';

export interface WorkspaceManagerAPI {
  openWorkspace: (type: 'global' | 'mine' | 'report' | 'archive', title: string, params?: Record<string, unknown>) => void;
  closeWorkspace: (id: string) => void;
  activateWorkspace: (id: string) => void;
}

function WorkspaceRouter({ workspace, manager }: { workspace: NonNullable<ReturnType<typeof useWorkspaceManager>['activeWorkspace']>; manager: WorkspaceManagerAPI }) {
  switch (workspace.type) {
    case 'global':
      return <GlobalOverview manager={manager} />;
    case 'mine':
      return <MineWorkspace manager={manager} params={workspace.params} />;
    case 'report':
      return <ReportWorkspace manager={manager} params={workspace.params} />;
    case 'archive':
      return <ArchiveWorkspace manager={manager} params={workspace.params} />;
    default:
      return <GlobalOverview manager={manager} />;
  }
}

function GothamApp() {
  const { workspaces, activeId, activeWorkspace, openWorkspace, closeWorkspace, activateWorkspace } = useWorkspaceManager();

  const manager: WorkspaceManagerAPI = {
    openWorkspace,
    closeWorkspace,
    activateWorkspace,
  };

  return (
    <div className="app-shell">
      <TopBar
        activeWorkspace={activeWorkspace}
        workspaces={workspaces}
        activeId={activeId}
        onOpenWorkspace={openWorkspace}
        onActivateWorkspace={activateWorkspace}
        onCloseWorkspace={closeWorkspace}
      />
      <main className="workspace-stage">
        <BusinessStatus />
        {activeWorkspace ? (
          <WorkspaceRouter workspace={activeWorkspace} manager={manager} />
        ) : (
          <div className="workspace-empty">无活跃工作区</div>
        )}
      </main>
    </div>
  );
}
export default function App() { return <BusinessProvider><GothamApp /></BusinessProvider>; }
