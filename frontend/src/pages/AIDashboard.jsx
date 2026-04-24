import React, { useState, useEffect, useRef } from 'react';
import { aiAPI, sprintAPI } from '../services/api';
import { useProjects } from '../hooks/useProjects';
import { useAuth } from '../hooks/useAuth';
import { priorityIcons, priorityLabels, getAvatarColor, getInitials } from '../utils/helpers';
import { LineChart, Line, BarChart, Bar, AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, Cell } from 'recharts';

const LIGHT_TOOLTIP = { background: '#ffffff', border: '1px solid #ECEEF2', borderRadius: 10, color: '#1F2937', fontSize: 12, boxShadow: '0 4px 12px rgba(0,0,0,0.08)' };

const AIDashboard = () => {
  const { projects, loading: projectsLoading } = useProjects();
  const [selectedProject, setSelectedProject] = useState('all');
  const [loading, setLoading] = useState(true);
  const [risk, setRisk] = useState(null);
  const [delays, setDelays] = useState(null);
  const [workload, setWorkload] = useState(null);
  const [velocity, setVelocity] = useState(null);
  const [productivity, setProductivity] = useState(null);
  const [bottlenecks, setBottlenecks] = useState(null);
  const [insights, setInsights] = useState([]);
  const [activeSprint, setActiveSprint] = useState(null);
  const [retro, setRetro] = useState(null);

  const { user, organization } = useAuth();
  const isAdmin = organization?.owner === user?.id || user?.role === 'admin';

  const [csvFile, setCsvFile] = useState(null);
  const [csvType, setCsvType] = useState('sprint_history');
  const [uploadingCSV, setUploadingCSV] = useState(false);
  const [csvResult, setCsvResult] = useState(null);
  const [csvError, setCsvError] = useState(null);
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef(null);

  useEffect(() => {
    if (!projectsLoading) {
      loadAll();
    }
  }, [selectedProject, projects, projectsLoading]);

  const loadAll = async () => {
    setLoading(true);
    try {
      const pid = selectedProject !== 'all' ? selectedProject : projects[0]?._id;
      if (!pid && selectedProject === 'all' && projects.length === 0) { setLoading(false); return; }

      const calls = [
        aiAPI.getWorkload().catch(() => ({ data: null })),
        aiAPI.getInsights(pid || 'all').catch(() => ({ data: { insights: [] } })),
        aiAPI.getVelocity(pid || 'all').catch(() => ({ data: null })),
        aiAPI.getProductivity(pid || 'all').catch(() => ({ data: null })),
      ];

      if (pid) {
        calls.push(aiAPI.getDelays(pid).catch(() => ({ data: null })));
        calls.push(aiAPI.getBottlenecks(pid).catch(() => ({ data: null })));
        calls.push(sprintAPI.getAll(pid).catch(() => ({ data: [] })));
      }

      const results = await Promise.all(calls);
      setWorkload(results[0].data);
      setInsights(results[1].data?.insights || []);
      setVelocity(results[2].data);
      setProductivity(results[3].data);
      if (pid) {
        setDelays(results[4].data);
        setBottlenecks(results[5].data);
        const sprints = results[6].data || [];
        const active = sprints.find(s => s.status === 'active');
        setActiveSprint(active);
        if (active) {
          aiAPI.getSprintRisk(active._id).then(r => setRisk(r.data)).catch(() => {});
          aiAPI.getRetrospective(active._id).then(r => setRetro(r.data)).catch(() => {});
        }
      }
    } catch (err) { console.error(err); }
    finally { setLoading(false); }
  };

  if (loading) return <div className="loader-container"><div className="loader"></div></div>;

  const workloadData = workload?.distribution?.map(m => ({
    name: m.user?.name?.split(' ')[0] || 'Unassigned', points: m.openPoints, tasks: m.taskCount, overloaded: m.overloaded,
    p0: m.p0Count, p1: m.p1Count, p2: m.p2Count, p3: m.p3Count
  })) || [];

  const velocityData = velocity?.data || [];

  const handleDragOver = (e) => { e.preventDefault(); setIsDragging(true); };
  const handleDragLeave = () => setIsDragging(false);
  const handleDrop = (e) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files[0];
    if (file && file.name.endsWith('.csv')) {
      setCsvFile(file);
      setCsvError(null); setCsvResult(null);
    } else {
      setCsvError('Please upload a valid CSV file');
    }
  };

  const handleFileSelect = (e) => {
    const file = e.target.files[0];
    if (file) {
      setCsvFile(file);
      setCsvError(null); setCsvResult(null);
    }
  };

  const handleCSVUpload = async () => {
    if (!csvFile) return;
    setUploadingCSV(true); setCsvError(null);
    const formData = new FormData();
    formData.append('type', csvType);
    formData.append('csvFile', csvFile);
    try {
      const res = await aiAPI.uploadTrainingCSV(formData);
      setCsvResult(res.data);
      setCsvFile(null);
      if (fileInputRef.current) fileInputRef.current.value = '';
      loadAll(); // Refresh dashboard data
    } catch (err) {
      setCsvError(err.response?.data?.message || 'Failed to upload CSV');
    } finally {
      setUploadingCSV(false);
    }
  };

  return (
    <div className="animate-fade-in space-y-6">
      <div className="page-header">
        <div>
          <h1 className="page-title flex items-center gap-2">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-primary-500"><path d="M12 2a4 4 0 0 1 4 4v1a2 2 0 0 1 2 2v1a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2V9a2 2 0 0 1 2-2V6a4 4 0 0 1 4-4z"/><path d="M9 18h6"/><path d="M10 22h4"/></svg>
            AI Dashboard
          </h1>
          <p className="page-subtitle">Self-learning AI insights powered by your real project data</p>
        </div>
        <select className="select max-w-[200px]" value={selectedProject} onChange={e => setSelectedProject(e.target.value)}>
          <option value="all">All Projects</option>
          {projects.map(p => <option key={p._id} value={p._id}>{p.name}</option>)}
        </select>
      </div>

      {/* Data Gate */}
      {velocity && (
        <div className="glass-card p-4 border-primary-200">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium text-primary-600 flex items-center gap-1.5">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>
              AI Data Unlock Progress
            </span>
            <span className="text-xs text-surface-400">
              {velocity.demoMode ? `${velocity.realSprintCount} completed — need ${velocity.threshold} to unlock` : '✅ All features unlocked!'}
            </span>
          </div>
          <div className="progress-bar-track" style={{ height: '0.5rem' }}>
            <div className="progress-bar-fill bg-gradient-to-r from-primary-600 to-primary-400"
              style={{ width: `${Math.min(100, (velocity.realSprintCount / velocity.threshold) * 100)}%` }}></div>
          </div>
          <div className="flex justify-between mt-1.5 text-xs text-surface-400">
            <span>{velocity.realSprintCount} sprint{velocity.realSprintCount !== 1 ? 's' : ''} completed</span>
            <span>ML models {velocity.demoMode ? 'using demo data' : 'trained on your data'}</span>
          </div>
        </div>
      )}

      {/* CSV Upload Panel for Admins */}
      {isAdmin && (
        <div className="glass-card p-5 border-primary-200 bg-primary-50/30">
          <div className="flex flex-col md:flex-row gap-6">
            <div className="flex-1">
              <h3 className="text-sm font-semibold text-surface-700 mb-2 flex items-center gap-2">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-primary-500"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/></svg>
                Train AI with CSV Data
              </h3>
              <p className="text-xs text-surface-500 mb-4">
                Fast-track AI training by importing historical data instead of waiting for organic sprint completion.
              </p>
              
              <div className="mb-4">
                <label className="text-xs font-medium text-surface-600 block mb-1">Data Type</label>
                <select className="select select-sm w-full" value={csvType} onChange={e => setCsvType(e.target.value)}>
                  <option value="sprint_history">Sprint History (Velocity & Risk Models)</option>
                  <option value="completed_tasks">Completed Tasks (Estimation & Delay Models)</option>
                </select>
                <div className="mt-2 text-xs font-mono bg-surface-100 p-2 rounded text-surface-500 overflow-x-auto whitespace-nowrap">
                  {csvType === 'sprint_history' ? 
                    'Requires columns: sprintName, plannedPoints, completedPoints' : 
                    'Requires columns: title, storyPoints, daysToComplete, dueDate, completedOnTime'}
                </div>
              </div>

              {csvError && <p className="text-xs text-danger mb-2">{csvError}</p>}
              {csvResult && (
                <div className="mb-4 p-3 bg-green-50 border border-green-200 rounded-lg">
                  <p className="text-xs text-success font-medium mb-1">✅ Successfully processed {csvResult.rowsInserted} rows</p>
                  {csvResult.modelsRetrained?.length > 0 && (
                    <p className="text-xs text-success">Retrained models: {csvResult.modelsRetrained.join(', ')}</p>
                  )}
                </div>
              )}
            </div>

            <div className="flex-1">
              <div 
                className={`border-2 border-dashed rounded-xl p-6 text-center transition-colors h-full flex flex-col items-center justify-center
                  ${isDragging ? 'border-primary-500 bg-primary-50' : 'border-surface-300 hover:border-primary-400'}
                  ${csvFile ? 'bg-primary-50 border-primary-300' : ''}`}
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
              >
                {!csvFile ? (
                  <>
                    <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="text-surface-400 mb-2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="12" y1="18" x2="12" y2="12"/><polyline points="9 15 12 12 15 15"/></svg>
                    <p className="text-sm font-medium text-surface-700">Drag & drop your CSV here</p>
                    <p className="text-xs text-surface-500 mt-1 mb-3">or</p>
                    <input type="file" accept=".csv" className="hidden" ref={fileInputRef} onChange={handleFileSelect} />
                    <button className="btn btn-secondary py-1 px-3 text-xs" onClick={() => fileInputRef.current?.click()}>Browse Files</button>
                  </>
                ) : (
                  <>
                    <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="text-primary-500 mb-2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><polyline points="9 15 11 17 15 13"/></svg>
                    <p className="text-sm font-medium text-primary-700 truncate max-w-[200px] mb-3">{csvFile.name}</p>
                    <div className="flex gap-2">
                      <button className="btn btn-secondary py-1 px-3 text-xs" onClick={() => setCsvFile(null)} disabled={uploadingCSV}>Cancel</button>
                      <button className="btn btn-primary py-1 px-3 text-xs" onClick={handleCSVUpload} disabled={uploadingCSV}>
                        {uploadingCSV ? 'Uploading...' : 'Upload & Train'}
                      </button>
                    </div>
                  </>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Quick Insights */}
      {insights.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
          {insights.map((ins, i) => (
            <div key={i} className={`glass-card p-4 ${ins.severity === 'critical' ? 'border-red-200' : ins.severity === 'warning' ? 'border-amber-200' : ''}`}>
              <div className="flex items-start gap-3">
                <span className="text-xl">{ins.icon}</span>
                <div>
                  <p className="text-xs font-semibold text-surface-400 uppercase tracking-wider mb-1">{ins.type}</p>
                  <p className="text-sm text-surface-700">{ins.message}</p>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Sprint Risk */}
        {risk && (
          <div className="glass-card p-5">
            <h3 className="text-sm font-semibold text-surface-700 mb-4 flex items-center gap-2">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-primary-500"><path d="M18 20V10"/><path d="M12 20V4"/><path d="M6 20v-6"/></svg>
              Sprint Risk Score
            </h3>
            <div className="flex items-center gap-6">
              <div className="relative w-32 h-32">
                <svg viewBox="0 0 120 120" className="w-full h-full">
                  <circle cx="60" cy="60" r="50" fill="none" stroke="#ECEEF2" strokeWidth="8" />
                  <circle cx="60" cy="60" r="50" fill="none"
                    stroke={risk.score >= 60 ? '#ef4444' : risk.score >= 30 ? '#f59e0b' : '#10b981'}
                    strokeWidth="8" strokeDasharray={`${risk.score * 3.14} 314`} strokeLinecap="round"
                    transform="rotate(-90 60 60)" className="transition-all duration-1000" />
                  <text x="60" y="55" textAnchor="middle" className="fill-surface-900 font-bold" fontSize="28">{risk.score}</text>
                  <text x="60" y="75" textAnchor="middle" className={`text-xs font-semibold ${risk.level === 'high' ? 'fill-danger' : risk.level === 'medium' ? 'fill-warning' : 'fill-success'}`} fontSize="12">{risk.level.toUpperCase()}</text>
                </svg>
              </div>
              <div className="flex-1 space-y-2 text-sm">
                <p className="text-surface-600">{risk.explanation}</p>
                <div className="grid grid-cols-2 gap-2 mt-3">
                  <div className="bg-surface-50 border border-surface-200 rounded-lg px-3 py-2"><p className="text-xs text-surface-400">Tasks</p><p className="font-semibold text-surface-800">{risk.completedTasks}/{risk.totalTasks}</p></div>
                  <div className="bg-surface-50 border border-surface-200 rounded-lg px-3 py-2"><p className="text-xs text-surface-400">Days Left</p><p className="font-semibold text-surface-800">{risk.daysRemaining}</p></div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Workload */}
        <div className="glass-card p-5">
          <h3 className="text-sm font-semibold text-surface-700 mb-4 flex items-center gap-2">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-primary-500"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>
            Workload Distribution
          </h3>
          {workloadData.length > 0 ? (
            <>
              <ResponsiveContainer width="100%" height={200}>
                <BarChart data={workloadData} layout="vertical" margin={{ left: 10 }}>
                  <XAxis type="number" tick={{ fill: '#9CA3AF', fontSize: 11 }} axisLine={false} tickLine={false} />
                  <YAxis type="category" dataKey="name" tick={{ fill: '#4B5563', fontSize: 12 }} axisLine={false} tickLine={false} width={70} />
                  <Tooltip contentStyle={LIGHT_TOOLTIP} />
                  <Bar dataKey="points" name="Story Points" radius={[0, 6, 6, 0]}>
                    {workloadData.map((entry, i) => <Cell key={i} fill={entry.overloaded ? '#ef4444' : '#6366f1'} />)}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
              {workload?.summary && (
                <div className="flex gap-3 mt-3 text-xs text-surface-400">
                  <span>Avg: {workload.summary.avgPointsPerMember} pts/member</span>
                  {workload.summary.overloadedMembers > 0 && <span className="text-danger">⚠ {workload.summary.overloadedMembers} overloaded</span>}
                </div>
              )}
            </>
          ) : <p className="text-sm text-surface-400 py-8 text-center">No workload data</p>}
        </div>

        {/* Velocity Chart */}
        <div className="glass-card p-5">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-semibold text-surface-700 flex items-center gap-2">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-primary-500"><path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z"/></svg>
              Velocity Trend
            </h3>
            {velocity?.demoMode && <span className="badge badge-sm bg-amber-50 text-warning border border-amber-200">Demo Data</span>}
          </div>
          {velocityData.length > 0 ? (
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={velocityData} margin={{ left: -10 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#ECEEF2" />
                <XAxis dataKey="sprintName" tick={{ fill: '#9CA3AF', fontSize: 10 }} axisLine={false} tickLine={false} angle={-20} textAnchor="end" height={50} />
                <YAxis tick={{ fill: '#9CA3AF', fontSize: 11 }} axisLine={false} tickLine={false} />
                <Tooltip contentStyle={LIGHT_TOOLTIP} />
                <Bar dataKey="plannedPoints" name="Planned" fill="#D8DCE4" radius={[4, 4, 0, 0]} />
                <Bar dataKey="completedPoints" name="Completed" fill="#6366f1" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          ) : <p className="text-sm text-surface-400 py-8 text-center">Complete sprints to see velocity</p>}
        </div>

        {/* Delay Detection */}
        {delays && delays.predictions?.length > 0 && (
          <div className="glass-card p-5">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-semibold text-surface-700 flex items-center gap-2">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-warning"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
                Delay Detection
              </h3>
              <span className="badge badge-sm bg-red-50 text-danger border border-red-200">{delays.summary?.atRisk || 0} at risk</span>
            </div>
            <div className="space-y-2 max-h-[250px] overflow-auto custom-scroll">
              {delays.predictions.slice(0, 8).map((pred, i) => (
                <div key={i} className="flex items-center justify-between p-3 rounded-xl bg-surface-50 border border-surface-200 hover:bg-surface-100 transition-colors">
                  <div className="flex items-center gap-3 min-w-0">
                    <span className={`w-2 h-2 rounded-full shrink-0 ${pred.riskLevel === 'critical' ? 'bg-danger' : pred.riskLevel === 'warning' ? 'bg-warning' : 'bg-success'}`}></span>
                    <div className="min-w-0">
                      <div className="flex items-center gap-2"><span className="text-xs font-mono text-surface-400">{pred.taskKey}</span><span className="text-sm text-surface-700 truncate">{pred.title}</span></div>
                      {pred.reason && <p className="text-xs text-surface-400 mt-0.5 truncate">{pred.reason}</p>}
                    </div>
                  </div>
                  <span className={`badge badge-sm shrink-0 ml-2 ${pred.riskLevel === 'critical' ? 'bg-red-50 text-danger border border-red-200' : pred.riskLevel === 'warning' ? 'bg-amber-50 text-warning border border-amber-200' : 'bg-green-50 text-success border border-green-200'}`}>
                    {pred.riskLevel === 'on_track' ? '✓' : `+${pred.predictedDelayDays}d`}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Bottlenecks */}
        {bottlenecks && bottlenecks.bottlenecks?.length > 0 && (
          <div className="glass-card p-5">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-semibold text-surface-700 flex items-center gap-2">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-warning"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>
                Bottlenecks
              </h3>
              <span className="badge badge-sm bg-amber-50 text-warning border border-amber-200">{bottlenecks.count} blocked</span>
            </div>
            <div className="space-y-2">
              {bottlenecks.bottlenecks.map((b, i) => (
                <div key={i} className="p-3 rounded-xl bg-surface-50 border border-surface-200">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-sm text-surface-700 font-medium">{b.title}</span>
                    <span className="badge badge-sm bg-red-50 text-danger border border-red-200">{b.daysStuck}d stuck</span>
                  </div>
                  <p className="text-xs text-surface-400">{b.reason}</p>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Retrospective */}
        {retro && (
          <div className="glass-card p-5 lg:col-span-2">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-semibold text-surface-700 flex items-center gap-2">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-primary-500"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/><polyline points="10 9 9 9 8 9"/></svg>
                Sprint Retrospective
              </h3>
              {retro.demoMode && <span className="badge badge-sm bg-amber-50 text-warning border border-amber-200">Demo</span>}
            </div>
            <div className="grid grid-cols-1 md:grid-cols-[1fr_200px] gap-4">
              <div className="text-surface-600 whitespace-pre-line text-sm leading-relaxed">{retro.summary}</div>
              <div className="space-y-2">
                {Object.entries(retro.stats || {}).map(([key, val]) => (
                  <div key={key} className="bg-surface-50 border border-surface-200 rounded-lg px-3 py-2">
                    <p className="text-xs text-surface-400 capitalize">{key.replace(/([A-Z])/g, ' $1')}</p>
                    <p className="font-semibold text-surface-800">{typeof val === 'number' && key.includes('Rate') ? `${val}%` : val}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default AIDashboard;
