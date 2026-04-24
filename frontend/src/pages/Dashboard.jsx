import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { useProjects } from '../hooks/useProjects';
import { taskAPI, aiAPI } from '../services/api';
import { formatRelativeTime, getAvatarColor, getInitials, statusLabels, priorityIcons } from '../utils/helpers';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';

const Dashboard = () => {
  const { user } = useAuth();
  const { projects } = useProjects();
  const [recentTasks, setRecentTasks] = useState([]);
  const [stats, setStats] = useState({ total: 0, done: 0, inProgress: 0, todo: 0 });
  const [insights, setInsights] = useState([]);
  const [workload, setWorkload] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const tasksRes = await taskAPI.getAll({});
        const tasks = tasksRes.data;
        setRecentTasks(tasks.slice(0, 8));
        setStats({
          total: tasks.length,
          done: tasks.filter(t => t.status === 'done').length,
          inProgress: tasks.filter(t => t.status === 'in_progress').length,
          todo: tasks.filter(t => t.status === 'todo').length,
        });
        try {
          const [insightsRes, workloadRes] = await Promise.all([aiAPI.getInsights('all'), aiAPI.getWorkload()]);
          setInsights(insightsRes.data.insights || []);
          setWorkload(workloadRes.data);
        } catch (e) {}
      } catch (err) { console.error(err); }
      finally { setLoading(false); }
    };
    fetchData();
  }, []);

  if (loading) return <div className="loader-container"><div className="loader"></div></div>;

  const completionRate = stats.total > 0 ? Math.round((stats.done / stats.total) * 100) : 0;

  const statCards = [
    { label: 'Total Tasks', value: stats.total, icon: (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"/></svg>
    ), color: '#EEF2FF', iconColor: '#6366f1', borderColor: '#C7D2FE' },
    { label: 'In Progress', value: stats.inProgress, icon: (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z"/></svg>
    ), color: '#FFFBEB', iconColor: '#D97706', borderColor: '#FDE68A' },
    { label: 'Completed', value: stats.done, icon: (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M22 11.08V12a10 10 0 11-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>
    ), color: '#ECFDF5', iconColor: '#059669', borderColor: '#A7F3D0', sub: `${completionRate}%` },
    { label: 'Projects', value: projects.length, icon: (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M22 19a2 2 0 01-2 2H4a2 2 0 01-2-2V5a2 2 0 012-2h5l2 3h9a2 2 0 012 2z"/></svg>
    ), color: '#EFF6FF', iconColor: '#2563EB', borderColor: '#BFDBFE' },
  ];

  const workloadData = workload?.distribution?.map(m => ({ name: m.user?.name?.split(' ')[0] || '?', points: m.openPoints, tasks: m.taskCount })) || [];

  return (
    <div className="animate-fade-in space-y-6">
      <div className="page-header">
        <div>
          <h1 className="page-title">Dashboard</h1>
          <p className="page-subtitle">Welcome back, {user?.name?.split(' ')[0]}</p>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {statCards.map((card, i) => (
          <div key={i} className="stat-card group">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-2xl font-bold text-surface-900">{card.value}</p>
                <p className="text-sm text-surface-500 mt-0.5">{card.label}</p>
              </div>
              <div className="w-10 h-10 rounded-xl flex items-center justify-center transition-transform group-hover:scale-110" style={{ background: card.color, color: card.iconColor }}>
                {card.icon}
              </div>
            </div>
            {card.sub && <p className="text-xs text-success mt-2 font-medium">{card.sub} completion rate</p>}
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent Tasks */}
        <div className="glass-card p-5">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-semibold text-surface-800 text-sm">Recent Tasks</h2>
            <Link to="/projects" className="text-xs text-primary-600 hover:text-primary-700 font-medium">View All →</Link>
          </div>
          <div className="space-y-0.5">
            {recentTasks.length === 0 ? (
              <p className="text-sm text-surface-400 py-6 text-center">No tasks yet. Create a project to get started!</p>
            ) : recentTasks.map(task => (
              <div key={task._id} className="flex items-center justify-between py-2.5 px-3 rounded-lg hover:bg-surface-50 transition-colors group">
                <div className="flex items-center gap-3 min-w-0">
                  <span className={`badge badge-sm status-${task.status}`}>{statusLabels[task.status]}</span>
                  <span className="text-xs text-surface-400 font-mono">{task.taskKey}</span>
                  <span className="text-sm text-surface-700 truncate">{task.title}</span>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <span className="text-sm">{priorityIcons[task.priority]}</span>
                  {task.assigneeId && <div className="avatar avatar-sm" style={{ background: getAvatarColor(task.assigneeId.name) }}>{getInitials(task.assigneeId.name)}</div>}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* AI Insights */}
        <div className="glass-card p-5">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-semibold text-surface-800 text-sm flex items-center gap-2">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-primary-500"><path d="M12 2a4 4 0 0 1 4 4v1a2 2 0 0 1 2 2v1a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2V9a2 2 0 0 1 2-2V6a4 4 0 0 1 4-4z"/><path d="M9 18h6"/><path d="M10 22h4"/></svg>
              AI Insights
            </h2>
            <Link to="/ai" className="text-xs text-primary-600 hover:text-primary-700 font-medium">Full Dashboard →</Link>
          </div>
          <div className="space-y-2">
            {insights.length === 0 ? (
              <p className="text-sm text-surface-400 py-6 text-center">AI insights will appear as you add more tasks.</p>
            ) : insights.map((ins, i) => (
              <div key={i} className={`flex items-start gap-3 p-3 rounded-xl text-sm ${ins.severity === 'critical' ? 'bg-red-50 border border-red-100' : ins.severity === 'warning' ? 'bg-amber-50 border border-amber-100' : 'bg-surface-50 border border-surface-200'}`}>
                <span className="text-lg shrink-0">{ins.icon}</span>
                <p className="text-surface-600">{ins.message}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Projects */}
        <div className="glass-card p-5">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-semibold text-surface-800 text-sm">Projects</h2>
            <Link to="/projects" className="text-xs text-primary-600 hover:text-primary-700 font-medium">View All →</Link>
          </div>
          <div className="space-y-3">
            {projects.map(project => {
              const taskTotal = Object.values(project.taskStats || {}).reduce((s, v) => s + v, 0);
              const taskDone = project.taskStats?.done || 0;
              const progress = taskTotal > 0 ? Math.round((taskDone / taskTotal) * 100) : 0;
              return (
                <Link key={project._id} to={`/projects/${project._id}/tasks`} className="block p-3 rounded-xl hover:bg-surface-50 transition-colors border border-surface-200 group no-underline">
                  <div className="flex items-center gap-3 mb-2">
                    <span className="w-3 h-3 rounded-full shrink-0" style={{ background: project.color || '#6366f1' }}></span>
                    <span className="font-medium text-sm text-surface-800 group-hover:text-primary-600 transition-colors">{project.name}</span>
                    <span className="badge badge-sm bg-surface-100 text-surface-500">{project.key}</span>
                  </div>
                  <div className="progress-bar-track">
                    <div className="progress-bar-fill" style={{ width: `${progress}%` }}></div>
                  </div>
                  <div className="flex justify-between mt-1.5 text-xs text-surface-400">
                    <span>{taskTotal} tasks</span>
                    <span>{progress}% complete</span>
                  </div>
                </Link>
              );
            })}
          </div>
        </div>

        {/* Workload Chart */}
        <div className="glass-card p-5">
          <h2 className="font-semibold text-surface-800 text-sm mb-4 flex items-center gap-2">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-primary-500"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>
            Team Workload
          </h2>
          {workloadData.length > 0 ? (
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={workloadData} layout="vertical" margin={{ left: 10 }}>
                <XAxis type="number" tick={{ fill: '#9CA3AF', fontSize: 11 }} axisLine={false} tickLine={false} />
                <YAxis type="category" dataKey="name" tick={{ fill: '#4B5563', fontSize: 12 }} axisLine={false} tickLine={false} width={60} />
                <Tooltip contentStyle={{ background: '#ffffff', border: '1px solid #ECEEF2', borderRadius: 10, color: '#1F2937', fontSize: 12, boxShadow: '0 4px 12px rgba(0,0,0,0.08)' }} />
                <Bar dataKey="points" fill="#6366f1" radius={[0, 6, 6, 0]} name="Story Points" />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <p className="text-sm text-surface-400 py-6 text-center">No workload data available yet.</p>
          )}
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
