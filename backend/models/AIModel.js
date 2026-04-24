const mongoose = require('mongoose');

const aiModelSchema = new mongoose.Schema({
  orgId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Organization',
    required: true
  },
  modelType: {
    type: String,
    required: true,
    enum: ['velocity', 'estimation', 'risk', 'productivity', 'delay']
  },
  version: {
    type: Number,
    default: 1
  },
  parameters: {
    type: mongoose.Schema.Types.Mixed,
    default: {}
    // velocity: { avgVelocity, weightedAvg, decayFactor, sprintData[] }
    // estimation: { coefficients: { descLength, subtaskCount, priority }, intercept, r2 }
    // risk: { avgCompletionRate, riskBias, historicalRisks[] }
    // productivity: { memberRates: { userId: rate }, weeklyTrends[] }
    // delay: { avgDelayRate, taskTypeDelays: {} }
  },
  trainingData: {
    sampleCount: { type: Number, default: 0 },
    lastTrainedAt: { type: Date, default: null },
    accuracy: { type: Number, default: null }
  }
}, { timestamps: true });

aiModelSchema.index({ orgId: 1, modelType: 1 }, { unique: true });

module.exports = mongoose.model('AIModel', aiModelSchema);
