import React, { useState, useEffect } from 'react';
import { useAuth } from '../hooks/useAuth';
import { notificationAPI } from '../services/api';
import { getAvatarColor, getInitials, formatRelativeTime } from '../utils/helpers';

const Navbar = () => {
  const { user, logout } = useAuth();
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [showNotifs, setShowNotifs] = useState(false);
  const [showProfile, setShowProfile] = useState(false);
  const [showShortcuts, setShowShortcuts] = useState(false);

  useEffect(() => {
    const fetchNotifs = async () => {
      try {
        const res = await notificationAPI.getAll();
        setNotifications(res.data.notifications || []);
        setUnreadCount(res.data.unreadCount || 0);
      } catch (e) {}
    };
    fetchNotifs();
    const interval = setInterval(fetchNotifs, 30000);
    return () => clearInterval(interval);
  }, []);

  // Keyboard shortcuts
  useEffect(() => {
    const handler = (e) => {
      if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA' || e.target.contentEditable === 'true') return;
      if (e.key === '?') { e.preventDefault(); setShowShortcuts(s => !s); }
      if (e.key === 'Escape') { setShowNotifs(false); setShowProfile(false); setShowShortcuts(false); }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, []);

  const handleMarkAllRead = async () => {
    await notificationAPI.markAllRead();
    setUnreadCount(0);
    setNotifications(prev => prev.map(n => ({ ...n, read: true })));
  };

  return (
    <>
      <nav className="navbar">
        <div className="flex items-center gap-3">
          <h2 className="text-sm font-semibold text-surface-800">TaskFlow AI</h2>
          <span className="text-[10px] bg-primary-50 text-primary-600 px-2 py-0.5 rounded-full font-semibold border border-primary-100">Beta</span>
        </div>

        <div className="flex items-center gap-1.5">
          {/* Keyboard shortcut hint */}
          <button onClick={() => setShowShortcuts(true)} className="text-surface-400 hover:text-surface-700 text-xs px-2 py-1.5 rounded-lg hover:bg-surface-100 transition-colors" title="Keyboard shortcuts (?)">
            <kbd className="text-[10px] bg-surface-100 text-surface-500 px-1.5 py-0.5 rounded border border-surface-200 font-mono">?</kbd>
          </button>

          {/* Notifications */}
          <div className="relative">
            <button onClick={() => { setShowNotifs(!showNotifs); setShowProfile(false); }} className="relative p-2 text-surface-400 hover:text-surface-700 hover:bg-surface-100 rounded-lg transition-colors">
              <svg className="w-[18px] h-[18px]" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" /></svg>
              {unreadCount > 0 && <span className="absolute top-1 right-1 w-4 h-4 bg-danger rounded-full text-[10px] text-white flex items-center justify-center font-bold">{unreadCount > 9 ? '9+' : unreadCount}</span>}
            </button>

            {showNotifs && (
              <div className="absolute right-0 top-full mt-2 w-80 dropdown-menu z-50 animate-scale-in overflow-hidden">
                <div className="flex items-center justify-between px-4 py-3 border-b border-surface-200">
                  <span className="font-semibold text-sm text-surface-800">Notifications</span>
                  {unreadCount > 0 && <button onClick={handleMarkAllRead} className="text-xs text-primary-600 hover:text-primary-700 font-medium">Mark all read</button>}
                </div>
                <div className="max-h-72 overflow-auto custom-scroll">
                  {notifications.length === 0 ? (
                    <div className="p-6 text-center text-surface-400 text-sm">
                      <svg className="w-8 h-8 mx-auto mb-2 text-surface-300" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" /></svg>
                      No notifications yet
                    </div>
                  ) : notifications.slice(0, 10).map(n => (
                    <div key={n._id} className={`px-4 py-3 border-b border-surface-100 text-sm ${!n.read ? 'bg-primary-50/50' : ''} hover:bg-surface-50 transition-colors`}>
                      <p className="text-surface-700">{n.message}</p>
                      <span className="text-xs text-surface-400 mt-1 block">{formatRelativeTime(n.createdAt)}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Profile */}
          <div className="relative">
            <button onClick={() => { setShowProfile(!showProfile); setShowNotifs(false); }} className="flex items-center gap-2 hover:bg-surface-100 rounded-lg px-2 py-1.5 transition-colors">
              <div className="avatar avatar-sm" style={{ background: getAvatarColor(user?.name) }}>{getInitials(user?.name)}</div>
              <span className="text-sm text-surface-700 font-medium hidden sm:block">{user?.name?.split(' ')[0]}</span>
              <svg className="w-3.5 h-3.5 text-surface-400 hidden sm:block" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7"/></svg>
            </button>

            {showProfile && (
              <div className="absolute right-0 top-full mt-2 w-48 dropdown-menu z-50 animate-scale-in overflow-hidden">
                <div className="px-4 py-3 border-b border-surface-100">
                  <p className="text-sm font-medium text-surface-800">{user?.name}</p>
                  <p className="text-xs text-surface-400 truncate">{user?.email}</p>
                </div>
                <a href="/profile" className="flex items-center gap-2 px-4 py-2.5 text-sm text-surface-600 hover:bg-surface-50 transition-colors">
                  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>
                  Profile
                </a>
                <button onClick={logout} className="w-full text-left flex items-center gap-2 px-4 py-2.5 text-sm text-danger hover:bg-red-50 transition-colors">
                  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/></svg>
                  Sign out
                </button>
              </div>
            )}
          </div>
        </div>
      </nav>

      {/* Keyboard Shortcuts Modal */}
      {showShortcuts && (
        <div className="modal-overlay" onClick={() => setShowShortcuts(false)}>
          <div className="modal max-w-md animate-scale-in" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h2 className="text-lg font-semibold text-surface-900">Keyboard Shortcuts</h2>
              <button className="btn btn-ghost btn-icon" onClick={() => setShowShortcuts(false)}>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
              </button>
            </div>
            <div className="modal-body">
              {[
                ['C', 'Create new task'],
                ['/', 'Focus search'],
                ['?', 'Show shortcuts'],
                ['Esc', 'Close modal/panel']
              ].map(([key, desc]) => (
                <div key={key} className="flex items-center justify-between py-1.5">
                  <span className="text-sm text-surface-600">{desc}</span>
                  <kbd className="bg-surface-100 border border-surface-200 px-2.5 py-1 rounded-md text-xs font-mono text-surface-600">{key}</kbd>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default Navbar;
