import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useTasks } from '../hooks/useTasks';
import { projectAPI, aiAPI, sprintAPI, commentAPI, authAPI } from '../services/api';
import { statusLabels, priorityLabels, priorityIcons, getAvatarColor, getInitials, formatDate, formatRelativeTime, getDaysUntil } from '../utils/helpers';
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';

const STATUS_COLUMNS = ['backlog', 'todo', 'in_progress', 'in_review', 'done'];

const Tasks = () => {
  const { projectId } = useParams();
  const { tasks, loading, createTask, updateTask, deleteTask, getTasksByStatus } = useTasks(projectId);
  const [project, setProject] = useState(null);
  const [orgMembers, setOrgMembers] = useState([]);
  const [viewMode, setViewMode] = useState('board');
  const [showCreateTask, setShowCreateTask] = useState(false);
  const [selectedTask, setSelectedTask] = useState(null);
  const [showAI, setShowAI] = useState(false);
  const [aiData, setAiData] = useState(null);
  const [taskForm, setTaskForm] = useState({ title: '', description: '', priority: 'p2', status: 'todo', dueDate: '', labels: '', storyPoints: '', assigneeId: '' });
  const [isSuggesting, setIsSuggesting] = useState(false);
  const [comments, setComments] = useState([]);
  const [commentText, setCommentText] = useState('');
  const [draggedTask, setDraggedTask] = useState(null);
  const [dragOverColumn, setDragOverColumn] = useState(null);
  const [filterStatus, setFilterStatus] = useState('');
  const [filterPriority, setFilterPriority] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [sprints, setSprints] = useState([]);
  const [activeSprint, setActiveSprint] = useState(null);
  const [burndownData, setBurndownData] = useState(null);

  useEffect(() => {
    projectAPI.getOne(projectId).then(res => setProject(res.data)).catch(console.error);
    authAPI.getMembers().then(res => setOrgMembers(res.data.members || [])).catch(console.error);
    sprintAPI.getAll(projectId).then(res => {
      setSprints(res.data);
      const active = res.data.find(s => s.status === 'active');
      setActiveSprint(active);
      if (active) sprintAPI.getBurndown(active._id).then(r => setBurndownData(r.data)).catch(() => {});
    }).catch(console.error);
  }, [projectId]);

  useEffect(() => {
    if (selectedTask) {
      commentAPI.getAll(selectedTask._id).then(res => setComments(res.data)).catch(() => setComments([]));
    }
  }, [selectedTask?._id]);

  // Keyboard shortcut
  useEffect(() => {
    const handler = (e) => {
      if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return;
      if (e.key === 'c' || e.key === 'C') { e.preventDefault(); setShowCreateTask(true); }
      if (e.key === 'Escape') { setSelectedTask(null); setShowCreateTask(false); setShowAI(false); }
      if (e.key === '/') { e.preventDefault(); document.getElementById('task-search')?.focus(); }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, []);

  const tasksByStatus = getTasksByStatus();
  const filteredTasks = tasks.filter(t => {
    if (filterStatus && t.status !== filterStatus) return false;
    if (filterPriority && t.priority !== filterPriority) return false;
    if (searchQuery && !t.title.toLowerCase().includes(searchQuery.toLowerCase()) && !t.taskKey.toLowerCase().includes(searchQuery.toLowerCase())) return false;
    return true;
  });

  const handleCreateTask = async (e) => {
    e.preventDefault();
    try {
      await createTask({
        ...taskForm,
        labels: taskForm.labels ? taskForm.labels.split(',').map(l => l.trim()) : [],
        storyPoints: taskForm.storyPoints ? parseInt(taskForm.storyPoints) : null,
        sprintId: activeSprint?._id || null,
        assigneeId: taskForm.assigneeId || null
      });
      setTaskForm({ title: '', description: '', priority: 'p2', status: 'todo', dueDate: '', labels: '', storyPoints: '', assigneeId: '' });
      setShowCreateTask(false);
    } catch (err) { alert(err.response?.data?.message || 'Failed'); }
  };

  const handleSuggestAssignee = async () => {
    if (!taskForm.title) {
      alert("Please enter a task title first to get a suggestion.");
      return;
    }
    setIsSuggesting(true);
    try {
      const res = await aiAPI.suggestAssignee(projectId, {
        title: taskForm.title,
        description: taskForm.description,
        labels: taskForm.labels
      });
      if (res.data && res.data.assigneeId) {
        setTaskForm(prev => ({ ...prev, assigneeId: res.data.assigneeId }));
      } else {
        alert("Could not find a confident suggestion.");
      }
    } catch (err) {
      console.error(err);
      alert("Failed to get suggestion.");
    } finally {
      setIsSuggesting(false);
    }
  };

  const handleDragStart = (e, task) => { setDraggedTask(task); e.dataTransfer.effectAllowed = 'move'; };
  const handleDragOver = (e, status) => { e.preventDefault(); e.dataTransfer.dropEffect = 'move'; setDragOverColumn(status); };
  const handleDragLeave = () => setDragOverColumn(null);
  const handleDrop = async (e, newStatus) => {
    e.preventDefault();
    setDragOverColumn(null);
    if (draggedTask && draggedTask.status !== newStatus) await updateTask(draggedTask._id, { status: newStatus });
    setDraggedTask(null);
  };

  const handleAddComment = async () => {
    if (!commentText.trim() || !selectedTask) return;
    try {
      const res = await commentAPI.create({ taskId: selectedTask._id, body: commentText });
      setComments(prev => [...prev, res.data]);
      setCommentText('');
    } catch (err) { console.error(err); }
  };

  const loadAIInsights = async () => {
    setShowAI(!showAI);
    if (!showAI) {
      try {
        const [insightsRes, delayRes] = await Promise.all([aiAPI.getInsights(projectId), aiAPI.getDelays(projectId)]);
        setAiData({ insights: insightsRes.data, delays: delayRes.data });
      } catch (e) { console.error(e); }
    }
  };

  if (loading) return <div className="loader-container"><div className="loader"></div></div>;

  return (
    <div className="animate-fade-in space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-3">
          <Link to="/projects" className="btn btn-ghost btn-sm">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="15 18 9 12 15 6"/></svg>
            Back
          </Link>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full" style={{ background: project?.color || '#6366f1' }}></div>
            <h1 className="text-xl font-bold text-surface-900">{project?.name || 'Tasks'}</h1>
          </div>
          <span className="badge badge-sm bg-surface-100 text-surface-500 border border-surface-200">{tasks.length} tasks</span>
          {activeSprint && <span className="badge badge-sm bg-primary-50 text-primary-600 border border-primary-100">🏃 {activeSprint.name}</span>}
        </div>
        <div className="flex items-center gap-2">
          <button className={`btn btn-sm ${showAI ? 'btn-primary' : 'btn-secondary'}`} onClick={loadAIInsights}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 2a4 4 0 0 1 4 4v1a2 2 0 0 1 2 2v1a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2V9a2 2 0 0 1 2-2V6a4 4 0 0 1 4-4z"/><path d="M9 18h6"/><path d="M10 22h4"/></svg>
            AI
          </button>
          <div className="flex bg-surface-50 rounded-lg border border-surface-200 overflow-hidden">
            <button className={`px-3 py-1.5 text-xs font-medium transition-colors ${viewMode === 'board' ? 'bg-primary-50 text-primary-700' : 'text-surface-500 hover:text-surface-700'}`} onClick={() => setViewMode('board')}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="inline mr-1"><rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/></svg>
              Board
            </button>
            <button className={`px-3 py-1.5 text-xs font-medium transition-colors ${viewMode === 'list' ? 'bg-primary-50 text-primary-700' : 'text-surface-500 hover:text-surface-700'}`} onClick={() => setViewMode('list')}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="inline mr-1"><line x1="8" y1="6" x2="21" y2="6"/><line x1="8" y1="12" x2="21" y2="12"/><line x1="8" y1="18" x2="21" y2="18"/><line x1="3" y1="6" x2="3.01" y2="6"/><line x1="3" y1="12" x2="3.01" y2="12"/><line x1="3" y1="18" x2="3.01" y2="18"/></svg>
              List
            </button>
          </div>
          <button className="btn btn-primary btn-sm" onClick={() => setShowCreateTask(true)}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
            Task
          </button>
        </div>
      </div>

      {/* Filters */}
      <div className="flex gap-3 flex-wrap">
        <div className="relative max-w-xs flex-1">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" className="absolute left-3 top-1/2 -translate-y-1/2 text-surface-400"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
          <input id="task-search" className="input !pl-10" placeholder="Search tasks..." value={searchQuery} onChange={e => setSearchQuery(e.target.value)} />
        </div>
        <select className="select max-w-[140px]" value={filterStatus} onChange={e => setFilterStatus(e.target.value)}>
          <option value="">All Status</option>
          {STATUS_COLUMNS.map(s => <option key={s} value={s}>{statusLabels[s]}</option>)}
        </select>
        <select className="select max-w-[140px]" value={filterPriority} onChange={e => setFilterPriority(e.target.value)}>
          <option value="">All Priority</option>
          {Object.entries(priorityLabels).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
        </select>
      </div>

      {/* Burndown mini */}
      {activeSprint && burndownData && (
        <div className="glass-card p-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium text-surface-700 flex items-center gap-1.5">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-primary-500"><polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/></svg>
              Sprint Burndown — {activeSprint.name}
            </span>
            <span className="text-xs text-surface-400">{burndownData.totalPoints} points total</span>
          </div>
          <ResponsiveContainer width="100%" height={120}>
            <LineChart data={burndownData.burndown}>
              <XAxis dataKey="day" tick={{ fill: '#9CA3AF', fontSize: 10 }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fill: '#9CA3AF', fontSize: 10 }} axisLine={false} tickLine={false} />
              <Tooltip contentStyle={{ background: '#ffffff', border: '1px solid #ECEEF2', borderRadius: 8, fontSize: 11, boxShadow: '0 4px 12px rgba(0,0,0,0.08)' }} />
              <Line type="monotone" dataKey="idealRemaining" stroke="#D8DCE4" strokeDasharray="5 5" dot={false} name="Ideal" />
              <Line type="monotone" dataKey="actualRemaining" stroke="#6366f1" strokeWidth={2} dot={false} name="Actual" />
            </LineChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* AI Panel */}
      {showAI && aiData && (
        <div className="glass-card p-5 border-primary-200 animate-slide-up">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold text-surface-800 text-sm flex items-center gap-2">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-primary-500"><path d="M12 2a4 4 0 0 1 4 4v1a2 2 0 0 1 2 2v1a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2V9a2 2 0 0 1 2-2V6a4 4 0 0 1 4-4z"/><path d="M9 18h6"/><path d="M10 22h4"/></svg>
              AI Analysis
            </h3>
            <button className="btn btn-ghost btn-sm" onClick={() => setShowAI(false)}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
            </button>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <h4 className="text-sm font-medium text-surface-500 mb-2">Insights</h4>
              <div className="space-y-2">
                {aiData.insights?.insights?.map((ins, i) => (
                  <div key={i} className={`flex items-start gap-2 p-2.5 rounded-lg text-sm ${ins.severity === 'critical' ? 'bg-red-50 border border-red-100' : ins.severity === 'warning' ? 'bg-amber-50 border border-amber-100' : 'bg-surface-50 border border-surface-200'}`}>
                    <span>{ins.icon}</span><span className="text-surface-600">{ins.message}</span>
                  </div>
                ))}
              </div>
            </div>
            <div>
              <h4 className="text-sm font-medium text-surface-500 mb-2">Delay Predictions</h4>
              <div className="space-y-2">
                {aiData.delays?.predictions?.slice(0, 5).map((pred, i) => (
                  <div key={i} className="flex items-center justify-between p-2.5 rounded-lg bg-surface-50 border border-surface-200 text-sm">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-mono text-surface-400">{pred.taskKey}</span>
                      <span className="text-surface-700 truncate max-w-[150px]">{pred.title}</span>
                    </div>
                    <span className={`badge badge-sm ${pred.riskLevel === 'critical' ? 'bg-red-50 text-danger border border-red-200' : pred.riskLevel === 'warning' ? 'bg-amber-50 text-warning border border-amber-200' : 'bg-green-50 text-success border border-green-200'}`}>
                      {pred.riskLevel === 'on_track' ? '✓ On Track' : `${pred.predictedDelayDays}d delay`}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Board View */}
      {viewMode === 'board' && (
        <div className="flex gap-4 overflow-x-auto pb-4 custom-scroll">
          {STATUS_COLUMNS.map(status => (
            <div key={status}
              className={`kanban-column ${dragOverColumn === status ? 'kanban-column-drag-over' : ''}`}
              onDragOver={(e) => handleDragOver(e, status)} onDragLeave={handleDragLeave} onDrop={(e) => handleDrop(e, status)}>
              <div className="flex items-center gap-2 px-3 py-3">
                <span className={`status-dot status-dot-${status}`}></span>
                <span className="text-sm font-medium text-surface-700">{statusLabels[status]}</span>
                <span className="bg-surface-200 text-surface-500 px-1.5 py-0.5 rounded-md text-xs font-medium">{tasksByStatus[status]?.length || 0}</span>
              </div>
              <div className="px-2 pb-2 space-y-2 max-h-[calc(100vh-350px)] overflow-auto custom-scroll">
                {(tasksByStatus[status] || []).map(task => (
                  <div key={task._id}
                    className="glass-card-hover p-3 cursor-pointer group"
                    draggable onDragStart={(e) => handleDragStart(e, task)} onClick={() => setSelectedTask(task)}>
                    {task.labels?.length > 0 && (
                      <div className="flex gap-1 mb-2 flex-wrap">
                        {task.labels.slice(0, 3).map((l, i) => (
                          <span key={i} className="bg-primary-50 text-primary-600 px-1.5 py-0.5 rounded text-[10px] font-medium">{l}</span>
                        ))}
                      </div>
                    )}
                    <p className="text-sm text-surface-800 font-medium leading-snug mb-2 group-hover:text-primary-600 transition-colors">{task.title}</p>
                    <div className="flex items-center justify-between">
                      <span className="text-xs text-surface-400 font-mono">{task.taskKey}</span>
                      <div className="flex items-center gap-1.5">
                        {task.storyPoints && <span className="bg-surface-100 text-surface-500 px-1.5 py-0.5 rounded text-[10px] font-mono border border-surface-200">{task.storyPoints}sp</span>}
                        <span className={`badge badge-sm priority-${task.priority}`}>{priorityIcons[task.priority]}</span>
                        {task.assigneeId && <div className="avatar avatar-sm" style={{ background: getAvatarColor(task.assigneeId.name) }}>{getInitials(task.assigneeId.name)}</div>}
                      </div>
                    </div>
                    {task.dueDate && (
                      <div className={`text-xs mt-2 flex items-center gap-1 ${getDaysUntil(task.dueDate) < 0 && task.status !== 'done' ? 'text-danger' : getDaysUntil(task.dueDate) <= 2 ? 'text-warning' : 'text-surface-400'}`}>
                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>
                        {formatDate(task.dueDate)} {getDaysUntil(task.dueDate) < 0 && task.status !== 'done' ? '(overdue)' : ''}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* List View */}
      {viewMode === 'list' && (
        <div className="glass-card overflow-hidden">
          <div className="grid grid-cols-[80px_1fr_100px_80px_80px_80px] gap-2 px-4 py-3 border-b border-surface-200 text-xs font-semibold text-surface-400 uppercase tracking-wider bg-surface-50">
            <span>Key</span><span>Title</span><span>Status</span><span>Priority</span><span>Assignee</span><span>Due</span>
          </div>
          {filteredTasks.map(task => (
            <div key={task._id} className="grid grid-cols-[80px_1fr_100px_80px_80px_80px] gap-2 px-4 py-3 border-b border-surface-100 hover:bg-surface-50 cursor-pointer transition-colors items-center" onClick={() => setSelectedTask(task)}>
              <span className="text-xs font-mono text-surface-400">{task.taskKey}</span>
              <span className="text-sm text-surface-800 truncate">{task.title}</span>
              <span className={`badge badge-sm status-${task.status}`}>{statusLabels[task.status]}</span>
              <span className={`badge badge-sm priority-${task.priority}`}>{priorityIcons[task.priority]}</span>
              <span>{task.assigneeId ? <div className="avatar avatar-sm" style={{ background: getAvatarColor(task.assigneeId.name) }}>{getInitials(task.assigneeId.name)}</div> : <span className="text-surface-300">—</span>}</span>
              <span className="text-xs text-surface-400">{task.dueDate ? formatDate(task.dueDate) : '—'}</span>
            </div>
          ))}
        </div>
      )}

      {/* Create Task Modal */}
      {showCreateTask && (
        <div className="modal-overlay" onClick={() => setShowCreateTask(false)}>
          <div className="modal animate-scale-in" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h2 className="text-lg font-semibold text-surface-900">Create Task</h2>
              <button className="btn btn-ghost btn-icon" onClick={() => setShowCreateTask(false)}>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
              </button>
            </div>
            <form onSubmit={handleCreateTask}>
              <div className="modal-body">
                <div><label className="block text-sm font-medium text-surface-700 mb-1.5">Title</label>
                  <input className="input" placeholder="Task title" value={taskForm.title} onChange={e => setTaskForm({ ...taskForm, title: e.target.value })} required /></div>
                <div><label className="block text-sm font-medium text-surface-700 mb-1.5">Description</label>
                  <textarea className="textarea" placeholder="Describe the task..." value={taskForm.description} onChange={e => setTaskForm({ ...taskForm, description: e.target.value })} /></div>
                <div className="grid grid-cols-2 gap-3">
                  <div><label className="block text-sm font-medium text-surface-700 mb-1.5">Priority</label>
                    <select className="select" value={taskForm.priority} onChange={e => setTaskForm({ ...taskForm, priority: e.target.value })}>
                      {Object.entries(priorityLabels).map(([k, v]) => <option key={k} value={k}>{priorityIcons[k]} {v}</option>)}
                    </select></div>
                  <div><label className="block text-sm font-medium text-surface-700 mb-1.5">Status</label>
                    <select className="select" value={taskForm.status} onChange={e => setTaskForm({ ...taskForm, status: e.target.value })}>
                      {STATUS_COLUMNS.map(s => <option key={s} value={s}>{statusLabels[s]}</option>)}
                    </select></div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div><label className="block text-sm font-medium text-surface-700 mb-1.5">Due Date</label>
                    <input type="date" className="input" value={taskForm.dueDate} onChange={e => setTaskForm({ ...taskForm, dueDate: e.target.value })} /></div>
                  <div><label className="block text-sm font-medium text-surface-700 mb-1.5">Story Points</label>
                    <input type="number" className="input" placeholder="e.g. 5" min="1" max="21" value={taskForm.storyPoints} onChange={e => setTaskForm({ ...taskForm, storyPoints: e.target.value })} /></div>
                </div>
                
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <label className="block text-sm font-medium text-surface-700">Assignee</label>
                    <button type="button" onClick={handleSuggestAssignee} disabled={isSuggesting} className="text-xs font-medium text-primary-600 hover:text-primary-700 flex items-center gap-1 disabled:opacity-50">
                      {isSuggesting ? <span className="opacity-50">Suggesting...</span> : '🪄 Suggest'}
                    </button>
                  </div>
                  <select className="select" value={taskForm.assigneeId} onChange={e => setTaskForm({ ...taskForm, assigneeId: e.target.value })}>
                    <option value="">Unassigned</option>
                    {orgMembers.map(m => (
                      <option key={m.user?._id} value={m.user?._id}>{m.user?.name}</option>
                    ))}
                  </select>
                </div>

                <div><label className="block text-sm font-medium text-surface-700 mb-1.5">Labels (comma-separated)</label>
                  <input className="input" placeholder="frontend, bug, urgent" value={taskForm.labels} onChange={e => setTaskForm({ ...taskForm, labels: e.target.value })} /></div>
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-secondary" onClick={() => setShowCreateTask(false)}>Cancel</button>
                <button type="submit" className="btn btn-primary">Create Task</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Task Detail Modal */}
      {selectedTask && (
        <div className="modal-overlay" onClick={() => setSelectedTask(null)}>
          <div className="modal max-w-2xl animate-scale-in" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <div>
                <span className="text-xs font-mono text-surface-400">{selectedTask.taskKey}</span>
                <h2 className="text-lg font-semibold text-surface-900">{selectedTask.title}</h2>
              </div>
              <button className="btn btn-ghost btn-icon" onClick={() => setSelectedTask(null)}>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
              </button>
            </div>
            <div className="modal-body">
              <div className="grid grid-cols-[1fr_200px] gap-6">
                {/* Main */}
                <div className="space-y-4">
                  <div>
                    <h4 className="text-sm font-medium text-surface-500 mb-1">Description</h4>
                    <p className="text-sm text-surface-700">{selectedTask.description || 'No description'}</p>
                  </div>
                  {selectedTask.subtasks?.length > 0 && (
                    <div>
                      <h4 className="text-sm font-medium text-surface-500 mb-1">Subtasks ({selectedTask.subtasks.filter(s => s.completed).length}/{selectedTask.subtasks.length})</h4>
                      {selectedTask.subtasks.map((sub, i) => (
                        <div key={i} className="flex items-center gap-2 py-1"><input type="checkbox" checked={sub.completed} readOnly className="accent-primary-500 w-4 h-4 rounded" /><span className={`text-sm ${sub.completed ? 'line-through text-surface-400' : 'text-surface-700'}`}>{sub.title}</span></div>
                      ))}
                    </div>
                  )}
                  {/* Comments */}
                  <div>
                    <h4 className="text-sm font-medium text-surface-500 mb-2">Comments ({comments.length})</h4>
                    <div className="space-y-3 max-h-48 overflow-auto custom-scroll">
                      {comments.map((c, i) => (
                        <div key={c._id || i} className="flex gap-3">
                          <div className="avatar avatar-sm shrink-0" style={{ background: getAvatarColor(c.authorId?.name) }}>{getInitials(c.authorId?.name)}</div>
                          <div>
                            <div className="flex items-center gap-2"><span className="text-sm font-medium text-surface-800">{c.authorId?.name}</span><span className="text-xs text-surface-400">{formatRelativeTime(c.createdAt)}</span></div>
                            <p className="text-sm text-surface-600 mt-0.5">{c.body}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                    <div className="flex gap-2 mt-3">
                      <input className="input" placeholder="Add a comment..." value={commentText} onChange={e => setCommentText(e.target.value)} onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleAddComment(); } }} />
                      <button className="btn btn-primary btn-sm shrink-0" onClick={handleAddComment}>Send</button>
                    </div>
                  </div>
                </div>
                {/* Sidebar */}
                <div className="space-y-4 border-l border-surface-200 pl-4">
                  <div><label className="text-xs text-surface-400 uppercase tracking-wider font-semibold">Status</label>
                    <select className="select mt-1" value={selectedTask.status} onChange={e => { updateTask(selectedTask._id, { status: e.target.value }); setSelectedTask({ ...selectedTask, status: e.target.value }); }}>
                      {STATUS_COLUMNS.map(s => <option key={s} value={s}>{statusLabels[s]}</option>)}
                    </select></div>
                  <div><label className="text-xs text-surface-400 uppercase tracking-wider font-semibold">Priority</label>
                    <div className={`badge priority-${selectedTask.priority} mt-1`}>{priorityIcons[selectedTask.priority]} {priorityLabels[selectedTask.priority]}</div></div>
                  <div><label className="text-xs text-surface-400 uppercase tracking-wider font-semibold">Story Points</label>
                    <p className="text-sm text-surface-700 mt-1">{selectedTask.storyPoints || '—'}</p></div>
                  <div><label className="text-xs text-surface-400 uppercase tracking-wider font-semibold">Assignee</label>
                    <select className="select mt-1" value={selectedTask.assigneeId?._id || ''} onChange={e => { updateTask(selectedTask._id, { assigneeId: e.target.value || null }); setSelectedTask({ ...selectedTask, assigneeId: orgMembers.find(m => m.user?._id === e.target.value)?.user || null }); }}>
                      <option value="">Unassigned</option>
                      {orgMembers.map(m => (
                        <option key={m.user?._id} value={m.user?._id}>{m.user?.name}</option>
                      ))}
                    </select>
                  </div>
                  <div><label className="text-xs text-surface-400 uppercase tracking-wider font-semibold">Due Date</label>
                    <p className="text-sm text-surface-700 mt-1">{selectedTask.dueDate ? formatDate(selectedTask.dueDate) : 'No due date'}</p></div>
                  {selectedTask.labels?.length > 0 && (
                    <div><label className="text-xs text-surface-400 uppercase tracking-wider font-semibold">Labels</label>
                      <div className="flex gap-1 flex-wrap mt-1">{selectedTask.labels.map((l, i) => <span key={i} className="bg-primary-50 text-primary-600 px-2 py-0.5 rounded text-xs font-medium">{l}</span>)}</div></div>
                  )}
                  <button className="btn btn-danger btn-sm w-full mt-4" onClick={() => { if (confirm('Delete this task?')) { deleteTask(selectedTask._id); setSelectedTask(null); } }}>
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>
                    Delete
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Tasks;
