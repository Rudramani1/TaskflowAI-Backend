const mongoose = require('mongoose');

const projectSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'Project name is required'],
    trim: true,
    maxlength: 100
  },
  description: {
    type: String,
    default: ''
  },
  key: {
    type: String,
    required: true,
    uppercase: true,
    maxlength: 5
  },
  organizationId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Organization',
    required: true
  },
  owner: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  color: {
    type: String,
    default: '#6366f1'
  },
  visibility: {
    type: String,
    enum: ['public', 'private'],
    default: 'public'
  },
  members: [{
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    role: { type: String, enum: ['admin', 'member', 'guest'], default: 'member' }
  }],
  status: {
    type: String,
    enum: ['active', 'archived', 'completed'],
    default: 'active'
  },
  archivedAt: {
    type: Date,
    default: null
  },
  taskCount: {
    type: Number,
    default: 0
  }
}, { timestamps: true });

projectSchema.index({ organizationId: 1 });

module.exports = mongoose.model('Project', projectSchema);
