const mongoose = require('mongoose');

const savedViewSchema = new mongoose.Schema({
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
    required: true,
    trim: true
  },
  filters: {
    status: [String],
    priority: [String],
    assigneeId: [{ type: mongoose.Schema.Types.ObjectId }],
    labels: [String],
    dueDateFrom: Date,
    dueDateTo: Date,
    searchQuery: String
  },
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  }
}, { timestamps: true });

savedViewSchema.index({ orgId: 1, projectId: 1 });

module.exports = mongoose.model('SavedView', savedViewSchema);
