const mongoose = require('mongoose');

const sprintSchema = new mongoose.Schema({
  orgId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Organization',
    required: true
  },
  projectId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Project',
    required: true
  },
  name: {
    type: String,
    required: [true, 'Sprint name is required'],
    trim: true,
    maxlength: 100
  },
  goal: {
    type: String,
    default: ''
  },
  startDate: {
    type: Date,
    required: true
  },
  endDate: {
    type: Date,
    required: true
  },
  status: {
    type: String,
    enum: ['planned', 'active', 'complete'],
    default: 'planned'
  },
  velocityPoints: {
    type: Number,
    default: null
  }
}, { timestamps: true });

sprintSchema.index({ orgId: 1, projectId: 1 });
sprintSchema.index({ orgId: 1, status: 1 });

module.exports = mongoose.model('Sprint', sprintSchema);
