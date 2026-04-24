const mongoose = require('mongoose');

const sprintHistorySchema = new mongoose.Schema({
  orgId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Organization',
    required: true
  },
  sprintId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Sprint',
    required: true,
    unique: true
  },
  projectId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Project',
    required: true
  },
  plannedPoints: {
    type: Number,
    default: 0
  },
  completedPoints: {
    type: Number,
    default: 0
  },
  memberStats: [{
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    pointsCompleted: { type: Number, default: 0 },
    tasksCompleted: { type: Number, default: 0 }
  }],
  retrospectiveSummary: {
    type: String,
    default: ''
  },
  completedAt: {
    type: Date,
    default: Date.now
  }
}, { timestamps: true });

sprintHistorySchema.index({ orgId: 1, projectId: 1 });

module.exports = mongoose.model('SprintHistory', sprintHistorySchema);
