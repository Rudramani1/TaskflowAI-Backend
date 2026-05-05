import api from './axiosInstance';

export const authAPI = {
  login: (data) => api.post('/auth/login', data),
  signup: (data) => api.post('/auth/signup', data),
  refresh: (refreshToken) => api.post('/auth/refresh', { refreshToken }),
  getProfile: () => api.get('/auth/me'),
  updateProfile: (data) => api.put('/auth/profile', data),
  createOrganization: (data) => api.post('/auth/organization', data),
  inviteMember: (data) => api.post('/auth/invite', data),
  joinOrganization: (token) => api.post(`/auth/join/${token}`),
  getInviteInfo: (token) => api.get(`/auth/invite/${token}/info`),
  getMembers: () => api.get('/auth/members')
};

export const projectAPI = {
  getAll: () => api.get('/projects'),
  getOne: (id) => api.get(`/projects/${id}`),
  create: (data) => api.post('/projects', data),
  update: (id, data) => api.put(`/projects/${id}`, data),
  delete: (id) => api.delete(`/projects/${id}`),
  addMember: (id, userId, role) => api.post(`/projects/${id}/members`, { userId, role }),
  getStats: (id) => api.get(`/projects/${id}/stats`)
};

export const taskAPI = {
  getAll: (params) => api.get('/tasks', { params }),
  getOne: (id) => api.get(`/tasks/${id}`),
  create: (data) => api.post('/tasks', data),
  update: (id, data) => api.put(`/tasks/${id}`, data),
  delete: (id) => api.delete(`/tasks/${id}`),
  updateSubtasks: (id, subtasks) => api.put(`/tasks/${id}/subtasks`, { subtasks }),
  updateChecklist: (id, checklist) => api.put(`/tasks/${id}/checklist`, { checklist }),
  reorder: (tasks) => api.patch('/tasks/reorder', { tasks }),
  getActivity: (id) => api.get(`/tasks/${id}/activity`)
};

export const sprintAPI = {
  getAll: (projectId) => api.get('/sprints', { params: { projectId } }),
  getOne: (id) => api.get(`/sprints/${id}`),
  create: (data) => api.post('/sprints', data),
  update: (id, data) => api.put(`/sprints/${id}`, data),
  close: (id, data) => api.post(`/sprints/${id}/close`, data),
  getBurndown: (id) => api.get(`/sprints/${id}/burndown`)
};

export const commentAPI = {
  getAll: (taskId) => api.get('/comments', { params: { taskId } }),
  create: (data) => api.post('/comments', data),
  delete: (id) => api.delete(`/comments/${id}`)
};

export const notificationAPI = {
  getAll: () => api.get('/notifications'),
  markRead: (id) => api.patch(`/notifications/${id}/read`),
  markAllRead: () => api.post('/notifications/read-all')
};

export const aiAPI = {
  estimatePoints: (title, description) => api.post('/ai/estimate-points', { title, description }),
  getSprintRisk: (sprintId) => api.get(`/ai/sprint-risk/${sprintId}`),
  getDelays: (projectId) => api.get(`/ai/delays/${projectId}`),
  getWorkload: () => api.get('/ai/workload'),
  getBottlenecks: (projectId) => api.get(`/ai/bottlenecks/${projectId}`),
  suggestAssignee: (projectId, params) => api.get(`/ai/suggest-assignee/${projectId}`, { params }),
  getInsights: (projectId) => api.get(`/ai/insights/${projectId}`),
  getVelocity: (projectId) => api.get(`/ai/velocity/${projectId}`),
  getProductivity: (projectId) => api.get(`/ai/productivity/${projectId}`),
  getRetrospective: (sprintId) => api.get(`/ai/retrospective/${sprintId}`),
  getPrioritization: (sprintId) => api.get(`/ai/prioritize/${sprintId}`),
  trainModels: () => api.post('/ai/train'),
  uploadTrainingCSV: (formData) => api.post('/ai/upload-training-csv', formData, {
    headers: { 'Content-Type': 'multipart/form-data' }
  })
};
