import React, { useState, useEffect } from 'react';
import { taskAPI } from '../services/api';
import { priorityIcons, statusLabels, formatDate, getAvatarColor, getInitials } from '../utils/helpers';

const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

const Calendar = () => {
  const [tasks, setTasks] = useState([]);
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedDay, setSelectedDay] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    taskAPI.getAll({}).then(res => { setTasks(res.data); setLoading(false); }).catch(() => setLoading(false));
  }, []);

  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();
  const firstDay = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();

  const prevMonth = () => setCurrentDate(new Date(year, month - 1, 1));
  const nextMonth = () => setCurrentDate(new Date(year, month + 1, 1));
  const today = new Date();
  const isToday = (day) => day === today.getDate() && month === today.getMonth() && year === today.getFullYear();

  const getTasksForDay = (day) => {
    const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    return tasks.filter(t => t.dueDate && t.dueDate.substring(0, 10) === dateStr);
  };

  const selectedDayTasks = selectedDay ? getTasksForDay(selectedDay) : [];

  if (loading) return <div className="loader-container"><div className="loader"></div></div>;

  return (
    <div className="animate-fade-in space-y-6">
      <div className="page-header">
        <div>
          <h1 className="page-title flex items-center gap-2">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-primary-500"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>
            Calendar
          </h1>
          <p className="page-subtitle">Tasks by due date</p>
        </div>
      </div>

      <div className="glass-card p-5">
        {/* Month nav */}
        <div className="flex items-center justify-between mb-6">
          <button className="btn btn-ghost btn-sm" onClick={prevMonth}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="15 18 9 12 15 6"/></svg>
            Previous
          </button>
          <h2 className="text-lg font-bold text-surface-900">{MONTHS[month]} {year}</h2>
          <button className="btn btn-ghost btn-sm" onClick={nextMonth}>
            Next
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="9 18 15 12 9 6"/></svg>
          </button>
        </div>

        {/* Day headers */}
        <div className="grid grid-cols-7 gap-1 mb-2">
          {DAYS.map(d => <div key={d} className="text-center text-xs font-semibold text-surface-400 py-2">{d}</div>)}
        </div>

        {/* Calendar grid */}
        <div className="grid grid-cols-7 gap-1">
          {Array.from({ length: firstDay }, (_, i) => <div key={`empty-${i}`} className="h-24"></div>)}
          {Array.from({ length: daysInMonth }, (_, i) => {
            const day = i + 1;
            const dayTasks = getTasksForDay(day);
            return (
              <div key={day}
                className={`calendar-day ${isToday(day) ? 'calendar-day-today' : selectedDay === day ? 'calendar-day-selected' : ''}`}
                onClick={() => setSelectedDay(day)}>
                <span className={`text-sm font-medium ${isToday(day) ? 'text-primary-600 font-bold' : 'text-surface-700'}`}>{day}</span>
                <div className="mt-1 space-y-0.5 overflow-hidden">
                  {dayTasks.slice(0, 3).map(t => (
                    <div key={t._id} className={`text-[10px] px-1.5 py-0.5 rounded truncate font-medium ${t.priority === 'p0' ? 'bg-red-50 text-danger' : t.priority === 'p1' ? 'bg-amber-50 text-warning' : 'bg-primary-50 text-primary-600'}`}>
                      {t.title}
                    </div>
                  ))}
                  {dayTasks.length > 3 && <span className="text-[10px] text-surface-400">+{dayTasks.length - 3} more</span>}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Selected day tasks */}
      {selectedDay && (
        <div className="glass-card p-5 animate-slide-up">
          <h3 className="font-semibold text-surface-800 mb-3">{MONTHS[month]} {selectedDay}, {year} — {selectedDayTasks.length} task{selectedDayTasks.length !== 1 ? 's' : ''}</h3>
          {selectedDayTasks.length === 0 ? (
            <p className="text-sm text-surface-400">No tasks due on this day.</p>
          ) : (
            <div className="space-y-2">
              {selectedDayTasks.map(task => (
                <div key={task._id} className="flex items-center justify-between p-3 rounded-xl bg-surface-50 border border-surface-200 hover:bg-surface-100 transition-colors">
                  <div className="flex items-center gap-3">
                    <span className={`badge badge-sm priority-${task.priority}`}>{priorityIcons[task.priority]}</span>
                    <div>
                      <p className="text-sm text-surface-700 font-medium">{task.title}</p>
                      <span className={`badge badge-sm status-${task.status} mt-1`}>{statusLabels[task.status]}</span>
                    </div>
                  </div>
                  {task.assigneeId && <div className="avatar avatar-sm" style={{ background: getAvatarColor(task.assigneeId.name) }}>{getInitials(task.assigneeId.name)}</div>}
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default Calendar;
