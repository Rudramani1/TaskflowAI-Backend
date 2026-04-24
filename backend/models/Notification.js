const mongoose = require('mongoose');

const notificationSchema = new mongoose.Schema({
  orgId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Organization',
    required: true
  },
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  type: {
    type: String,
    required: true,
    enum: ['assigned', 'mentioned', 'comment', 'deadline_today', 'sprint_ending', 'sprint_closed', 'task_updated']
  },
  entityId: {
    type: mongoose.Schema.Types.ObjectId,
    required: true
  },
  entityType: {
    type: String,
    enum: ['task', 'sprint', 'comment', 'project'],
    default: 'task'
  },
  message: {
    type: String,
    default: ''
  },
  read: {
    type: Boolean,
    default: false
  }
}, { timestamps: true });

notificationSchema.index({ userId: 1, read: 1, createdAt: -1 });
notificationSchema.index({ orgId: 1 });

module.exports = mongoose.model('Notification', notificationSchema);
