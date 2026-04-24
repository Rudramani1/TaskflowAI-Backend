import React, { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useProjects } from '../hooks/useProjects';
import { useAuth } from '../hooks/useAuth';

const navItems = [
  { path: '/', label: 'Dashboard', icon: (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/></svg>
  )},
  { path: '/projects', label: 'Projects', icon: (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"/></svg>
  )},
  { path: '/ai', label: 'AI Assistant', icon: (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 2a4 4 0 0 1 4 4v1a2 2 0 0 1 2 2v1a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2V9a2 2 0 0 1 2-2V6a4 4 0 0 1 4-4z"/><path d="M9 18h6"/><path d="M10 22h4"/><circle cx="9" cy="9" r="1" fill="currentColor"/><circle cx="15" cy="9" r="1" fill="currentColor"/></svg>
  )},
  { path: '/calendar', label: 'Calendar', icon: (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>
  )},
];

const Sidebar = () => {
  const location = useLocation();
  const { projects } = useProjects();
  const { organization } = useAuth();
  const [collapsed, setCollapsed] = useState(false);

  return (
    <aside className={`sidebar ${collapsed ? 'sidebar-collapsed' : 'sidebar-expanded'}`}>
      {/* Logo */}
      <div className="h-14 flex items-center justify-between px-4 border-b border-surface-200">
        {!collapsed && (
          <Link to="/" className="flex items-center gap-2.5 no-underline">
            <div className="h-8 flex items-center justify-center bg-transparent">
              <img src="/logo.png" alt="TaskFlow AI" className="h-full w-auto object-contain" />
            </div>
            <span className="font-bold text-surface-900 text-sm tracking-tight">TaskFlow</span>
            <span className="text-primary-600 text-[10px] font-semibold bg-primary-50 px-1.5 py-0.5 rounded-md">AI</span>
          </Link>
        )}
        <button onClick={() => setCollapsed(!collapsed)} className="p-1.5 text-surface-400 hover:text-surface-700 hover:bg-surface-100 rounded-lg transition-colors" title={collapsed ? 'Expand' : 'Collapse'}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            {collapsed ? <><polyline points="9 18 15 12 9 6"/></> : <><polyline points="15 18 9 12 15 6"/></>}
          </svg>
        </button>
      </div>

      {/* Org name */}
      {!collapsed && organization && (
        <div className="px-4 py-3 border-b border-surface-200">
          <p className="text-[10px] text-surface-400 uppercase tracking-widest font-semibold">Organization</p>
          <p className="text-sm font-medium text-surface-800 truncate mt-0.5">{organization.name}</p>
        </div>
      )}

      {/* Nav */}
      <nav className="flex-1 py-3 px-2.5 space-y-0.5 overflow-auto custom-scroll">
        {navItems.map(item => (
          <Link key={item.path} to={item.path}
            className={`sidebar-nav-item ${location.pathname === item.path ? 'sidebar-nav-item-active' : ''}`}
          >
            <span className="shrink-0 opacity-70">{item.icon}</span>
            {!collapsed && <span>{item.label}</span>}
          </Link>
        ))}

        {/* Projects section */}
        {!collapsed && projects.length > 0 && (
          <div className="pt-5">
            <p className="px-3 text-[10px] text-surface-400 uppercase tracking-widest font-semibold mb-2">Projects</p>
            {projects.slice(0, 8).map(project => (
              <Link key={project._id} to={`/projects/${project._id}/tasks`}
                className={`sidebar-nav-item ${location.pathname.includes(project._id) ? 'sidebar-nav-item-active' : ''}`}
              >
                <span className="w-2 h-2 rounded-full shrink-0" style={{ background: project.color || '#6366f1' }}></span>
                <span className="truncate text-[13px]">{project.name}</span>
              </Link>
            ))}
          </div>
        )}
      </nav>

      {/* Settings link */}
      <div className="p-2 border-t border-surface-200">
        <Link to="/profile" className={`sidebar-nav-item ${location.pathname === '/profile' ? 'sidebar-nav-item-active' : ''}`}>
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="opacity-70"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"/></svg>
          {!collapsed && <span>Settings</span>}
        </Link>
      </div>
    </aside>
  );
};

export default Sidebar;
