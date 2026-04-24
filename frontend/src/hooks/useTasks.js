import { useState, useEffect, useCallback } from 'react';
import { taskAPI } from '../services/api';

export function useTasks(projectId, sprintId) {
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchTasks = useCallback(async () => {
    try {
      setLoading(true);
      const params = {};
      if (projectId) params.projectId = projectId;
      if (sprintId) params.sprintId = sprintId;
      const res = await taskAPI.getAll(params);
      setTasks(res.data);
    } catch (err) {
      console.error('Fetch tasks error:', err);
    } finally {
      setLoading(false);
    }
  }, [projectId, sprintId]);

  useEffect(() => {
    fetchTasks();
  }, [fetchTasks]);

  const createTask = async (data) => {
    const res = await taskAPI.create({ ...data, projectId });
    setTasks(prev => [res.data, ...prev]);
    return res.data;
  };

  const updateTask = async (id, data) => {
    const res = await taskAPI.update(id, data);
    setTasks(prev => prev.map(t => t._id === id ? res.data : t));
    return res.data;
  };

  const deleteTask = async (id) => {
    await taskAPI.delete(id);
    setTasks(prev => prev.filter(t => t._id !== id));
  };

  const getTasksByStatus = () => {
    const grouped = { backlog: [], todo: [], in_progress: [], in_review: [], done: [] };
    tasks.forEach(task => {
      if (grouped[task.status]) grouped[task.status].push(task);
    });
    return grouped;
  };

  return { tasks, loading, createTask, updateTask, deleteTask, getTasksByStatus, fetchTasks, setTasks };
}
