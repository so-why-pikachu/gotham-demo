import { X } from './Icons';
import type { Workspace } from '../types/workspace.ts';

interface TabBarProps {
  workspaces: Workspace[];
  activeId: string | null;
  onActivate: (id: string) => void;
  onClose: (id: string) => void;
}

const typeIcon: Record<string, string> = {
  global: '◈',
  mine: '◉',
  report: '▤',
  archive: '▣',
};

export default function TabBar({ workspaces, activeId, onActivate, onClose }: TabBarProps) {
  return (
    <nav className="tabbar">
      <div className="tab-list">
        {workspaces.map((ws) => {
          const active = ws.id === activeId;
          return (
            <button
              key={ws.id}
              className={`tab ${active ? 'active' : ''}`}
              onClick={() => onActivate(ws.id)}
              onMouseDown={(e) => {
                if (e.button === 1) {
                  e.preventDefault();
                  onClose(ws.id);
                }
              }}
            >
              <span className="tab-icon">{typeIcon[ws.type] ?? '◈'}</span>
              <span className="tab-title">{ws.type === 'global' ? '总览' : ws.title}</span>
              <span
                className="tab-close"
                onClick={(e) => {
                  e.stopPropagation();
                  onClose(ws.id);
                }}
              >
                <X size={12} />
              </span>
            </button>
          );
        })}
      </div>
    </nav>
  );
}
