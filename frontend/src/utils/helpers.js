export const statusLabels = {
  backlog: 'Backlog',
  todo: 'To Do',
  in_progress: 'In Progress',
  in_review: 'In Review',
  done: 'Done'
};

export const priorityLabels = {
  p0: 'Critical',
  p1: 'High',
  p2: 'Medium',
  p3: 'Low'
};

export const priorityIcons = {
  p0: '🔴',
  p1: '🟠',
  p2: '🔵',
  p3: '⚪'
};

export const priorityColors = {
  p0: '#ef4444',
  p1: '#f59e0b',
  p2: '#3b82f6',
  p3: '#64748b'
};

export const statusColors = {
  backlog: '#64748b',
  todo: '#94a3b8',
  in_progress: '#6366f1',
  in_review: '#f59e0b',
  done: '#10b981'
};

export function getAvatarColor(name) {
  if (!name) return '#6366f1';
  const colors = ['#6366f1', '#ec4899', '#14b8a6', '#f59e0b', '#8b5cf6', '#ef4444', '#06b6d4', '#84cc16'];
  let hash = 0;
  for (let i = 0; i < name.length; i++) hash = name.charCodeAt(i) + ((hash << 5) - hash);
  return colors[Math.abs(hash) % colors.length];
}

export function getInitials(name) {
  if (!name) return '?';
  return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
}

export function formatDate(date) {
  if (!date) return '';
  return new Date(date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

export function formatFullDate(date) {
  if (!date) return '';
  return new Date(date).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
}

export function formatRelativeTime(date) {
  if (!date) return '';
  const now = new Date();
  const diff = (now - new Date(date)) / 1000;
  if (diff < 60) return 'just now';
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  if (diff < 604800) return `${Math.floor(diff / 86400)}d ago`;
  return formatDate(date);
}

export function getDaysUntil(date) {
  if (!date) return null;
  return Math.ceil((new Date(date) - new Date()) / (1000 * 60 * 60 * 24));
}
