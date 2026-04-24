import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { useProjects } from '../hooks/useProjects';
import { projectAPI } from '../services/api';

const COLORS = ['#6366f1', '#ec4899', '#10b981', '#f59e0b', '#8b5cf6', '#ef4444', '#06b6d4', '#84cc16'];

const Projects = () => {
  const { projects, fetchProjects } = useProjects();
  const [showCreate, setShowCreate] = useState(false);
  const [form, setForm] = useState({ name: '', description: '', key: '', color: '#6366f1', visibility: 'public' });

  const handleCreate = async (e) => {
    e.preventDefault();
    try {
      await projectAPI.create(form);
      setForm({ name: '', description: '', key: '', color: '#6366f1', visibility: 'public' });
      setShowCreate(false);
      fetchProjects();
    } catch (err) { alert(err.response?.data?.message || 'Failed to create project'); }
  };

  const handleDelete = async (id) => {
    if (!confirm('Delete this project and all its tasks?')) return;
    await projectAPI.delete(id);
    fetchProjects();
  };

  return (
    <div className="animate-fade-in space-y-6">
      <div className="page-header">
        <div>
          <h1 className="page-title">Projects</h1>
          <p className="page-subtitle">{projects.length} project{projects.length !== 1 ? 's' : ''}</p>
        </div>
        <button className="btn btn-primary" onClick={() => setShowCreate(true)}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
          New Project
        </button>
      </div>

      {projects.length === 0 ? (
        <div className="glass-card p-12 text-center">
          <div className="w-16 h-16 rounded-2xl bg-primary-50 flex items-center justify-center mx-auto mb-4">
            <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="text-primary-500"><path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"/></svg>
          </div>
          <h3 className="text-lg font-semibold text-surface-800 mb-2">No projects yet</h3>
          <p className="text-sm text-surface-400 mb-4">Create your first project to start managing tasks</p>
          <button className="btn btn-primary" onClick={() => setShowCreate(true)}>Create Project</button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {projects.map(project => {
            const taskTotal = Object.values(project.taskStats || {}).reduce((s, v) => s + v, 0);
            const taskDone = project.taskStats?.done || 0;
            const progress = taskTotal > 0 ? Math.round((taskDone / taskTotal) * 100) : 0;
            return (
              <Link key={project._id} to={`/projects/${project._id}/tasks`} className="glass-card-hover p-5 group block no-underline">
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl flex items-center justify-center text-white font-bold text-sm shadow-sm" style={{ background: project.color || '#6366f1' }}>
                      {project.key}
                    </div>
                    <div>
                      <h3 className="font-semibold text-surface-800 group-hover:text-primary-600 transition-colors">{project.name}</h3>
                      <p className="text-xs text-surface-400">{project.visibility === 'private' ? '🔒 Private' : '🌐 Public'}</p>
                    </div>
                  </div>
                  <button onClick={(e) => { e.preventDefault(); handleDelete(project._id); }} className="opacity-0 group-hover:opacity-100 text-surface-400 hover:text-danger transition-all p-1.5 rounded-lg hover:bg-red-50">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>
                  </button>
                </div>
                {project.description && <p className="text-xs text-surface-400 mb-3 line-clamp-2">{project.description}</p>}
                <div className="progress-bar-track mb-2">
                  <div className="progress-bar-fill" style={{ width: `${progress}%` }}></div>
                </div>
                <div className="flex justify-between text-xs text-surface-400">
                  <span>{taskTotal} tasks</span>
                  <span>{progress}%</span>
                </div>
              </Link>
            );
          })}
        </div>
      )}

      {/* Create Modal */}
      {showCreate && (
        <div className="modal-overlay" onClick={() => setShowCreate(false)}>
          <div className="modal animate-scale-in" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h2 className="text-lg font-semibold text-surface-900">New Project</h2>
              <button className="btn btn-ghost btn-icon" onClick={() => setShowCreate(false)}>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
              </button>
            </div>
            <form onSubmit={handleCreate}>
              <div className="modal-body">
                <div>
                  <label className="block text-sm font-medium text-surface-700 mb-1.5">Project Name</label>
                  <input className="input" placeholder="My Awesome Project" value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} required />
                </div>
                <div>
                  <label className="block text-sm font-medium text-surface-700 mb-1.5">Key (3-5 chars)</label>
                  <input className="input" placeholder="MAP" maxLength={5} value={form.key} onChange={e => setForm({ ...form, key: e.target.value.toUpperCase() })} />
                </div>
                <div>
                  <label className="block text-sm font-medium text-surface-700 mb-1.5">Description</label>
                  <textarea className="textarea" placeholder="What's this project about?" value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} />
                </div>
                <div>
                  <label className="block text-sm font-medium text-surface-700 mb-1.5">Color</label>
                  <div className="flex gap-2">
                    {COLORS.map(c => (
                      <button key={c} type="button" onClick={() => setForm({ ...form, color: c })}
                        className={`w-8 h-8 rounded-full transition-all ${form.color === c ? 'ring-2 ring-primary-500 ring-offset-2 scale-110' : 'hover:scale-110'}`}
                        style={{ background: c }}></button>
                    ))}
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-surface-700 mb-1.5">Visibility</label>
                  <select className="select" value={form.visibility} onChange={e => setForm({ ...form, visibility: e.target.value })}>
                    <option value="public">🌐 Public</option>
                    <option value="private">🔒 Private</option>
                  </select>
                </div>
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-secondary" onClick={() => setShowCreate(false)}>Cancel</button>
                <button type="submit" className="btn btn-primary">Create Project</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default Projects;
