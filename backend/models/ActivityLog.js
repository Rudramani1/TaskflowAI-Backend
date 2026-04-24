const mongoose = require('mongoose');

const activityLogSchema = new mongoose.Schema({
  orgId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Organization',
    required: true
  },
  taskId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Task',
    required: true
  },
  actorId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  action: {
    type: String,
    required: true,
    enum: ['created', 'updated', 'deleted', 'commented', 'status_changed', 'assigned', 'priority_changed', 'sprint_changed', 'auto_prioritized']
  },
  diff: {
    type: mongoose.Schema.Types.Mixed,
    default: {}
  }
}, { timestamps: true });

activityLogSchema.index({ taskId: 1, createdAt: -1 });
activityLogSchema.index({ orgId: 1, createdAt: -1 });

module.exports = mongoose.model('ActivityLog', activityLogSchema);
