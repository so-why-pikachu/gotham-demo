import type { Workspace } from '../types/workspace.ts';
import { Activity, BarChart3, Bell, Globe2, Layers3, Search, Settings, User } from './Icons';
import TabBar from './TabBar';

interface TopBarProps {
  activeWorkspace: Workspace | null;
  workspaces: Workspace[];
  activeId: string | null;
  onOpenWorkspace: (type: 'global' | 'mine' | 'report' | 'archive', title: string) => void;
  onActivateWorkspace: (id: string) => void;
  onCloseWorkspace: (id: string) => void;
}

const navigationItems = [
  { type: 'global', title: 'Global Overview', label: 'Global overview', icon: Globe2 },
  { type: 'mine', title: '玉龙矿区', label: 'Operations', icon: Activity },
  { type: 'archive', title: '资料库', label: 'Archive', icon: Layers3 },
  { type: 'report', title: '商业报告', label: 'Reports', icon: BarChart3 },
] as const;

export default function TopBar({
  activeWorkspace,
  workspaces,
  activeId,
  onOpenWorkspace,
  onActivateWorkspace,
  onCloseWorkspace,
}: TopBarProps) {
  return (
    <header className="topbar">
      <div className="topbar-left">
        <div className="app-logo" role="img" aria-label="Gotham">
          <svg width="22" height="26" viewBox="0 0 24 28" fill="none" stroke="currentColor" strokeWidth="2.8" aria-hidden="true">
            <circle cx="12" cy="10" r="7.5" />
            <path d="M3 21.5 12 25.5 21 21.5" strokeLinejoin="miter" />
          </svg>
        </div>

        <nav className="topbar-nav" aria-label="Workspace navigation">
          {navigationItems.map((item) => {
            const Icon = item.icon;
            const active = activeWorkspace?.type === item.type;
            return (
              <button
                key={item.type}
                className={`nav-icon-btn ${active ? 'active' : ''}`}
                title={item.label}
                aria-label={`打开${item.label}`}
                aria-current={active ? 'page' : undefined}
                onClick={() => onOpenWorkspace(item.type, item.title)}
              >
                <Icon size={17} />
                <span className="nav-tooltip">{item.label}</span>
              </button>
            );
          })}
        </nav>

      </div>

      <TabBar
        workspaces={workspaces}
        activeId={activeId}
        onActivate={onActivateWorkspace}
        onClose={onCloseWorkspace}
      />

      <div className="topbar-right">
        <div className="global-search">
          <Search size={14} />
          <input type="text" placeholder="全局搜索…" />
        </div>
        <button className="icon-btn" title="通知">
          <Bell size={16} />
          <span className="badge" />
        </button>
        <button className="icon-btn" title="设置">
          <Settings size={16} />
        </button>
        <button className="user-btn">
          <User size={16} />
          <span>Operator</span>
        </button>
      </div>
    </header>
  );
}
