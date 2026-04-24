const mongoose = require('mongoose');

const aiPredictionLogSchema = new mongoose.Schema({
  orgId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Organization',
    required: true
  },
  predictionType: {
    type: String,
    required: true,
    enum: ['story_points', 'sprint_risk', 'delay', 'assignment', 'priority', 'velocity', 'productivity']
  },
  input: {
    type: mongoose.Schema.Types.Mixed,
    default: {}
  },
  output: {
    type: mongoose.Schema.Types.Mixed,
    default: {}
  },
  actual: {
    type: mongoose.Schema.Types.Mixed,
    default: null
    // filled in when outcome is known (e.g., task actually completed)
  },
  modelVersion: {
    type: Number,
    default: 0 // 0 = rule-based, 1+ = trained model version
  },
  entityId: {
    type: mongoose.Schema.Types.ObjectId,
    default: null
  },
  entityType: {
    type: String,
    enum: ['task', 'sprint', 'project', 'user'],
    default: 'task'
  }
}, { timestamps: true });

aiPredictionLogSchema.index({ orgId: 1, predictionType: 1, createdAt: -1 });
aiPredictionLogSchema.index({ entityId: 1, predictionType: 1 });

module.exports = mongoose.model('AIPredictionLog', aiPredictionLogSchema);
