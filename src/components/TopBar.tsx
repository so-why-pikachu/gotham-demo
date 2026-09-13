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
  { type: 'global', title: 'Global Overview', label: '总览', icon: Globe2 },
  { type: 'mine', title: '玉龙矿区', label: 'Operations', icon: Activity },
  { type: 'report', title: '商业报告', label: 'Reports', icon: BarChart3 },
  { type: 'archive', title: '资料库', label: 'Archive', icon: Layers3 },
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
        <button
          className="app-logo"
          title="Global Overview"
          aria-label="打开 Global Overview"
          onClick={() => onOpenWorkspace('global', 'Global Overview')}
        >
          <span className="logo-mark" />
        </button>

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
