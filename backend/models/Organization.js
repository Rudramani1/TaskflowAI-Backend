const mongoose = require('mongoose');
const slugify = require('slugify');

const organizationSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'Organization name is required'],
    trim: true,
    maxlength: 100
  },
  slug: {
    type: String,
    unique: true,
    lowercase: true
  },
  owner: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  members: [{
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    role: { type: String, enum: ['admin', 'member', 'guest'], default: 'member' },
    joinedAt: { type: Date, default: Date.now }
  }],
  invites: [{
    email: String,
    role: { type: String, enum: ['admin', 'member', 'guest'], default: 'member' },
    token: String,
    invitedAt: { type: Date, default: Date.now },
    status: { type: String, enum: ['pending', 'accepted', 'declined'], default: 'pending' }
  }],
  description: {
    type: String,
    default: ''
  }
}, { timestamps: true });

// Auto-generate slug from name
organizationSchema.pre('save', function(next) {
  if (this.isModified('name') || !this.slug) {
    this.slug = slugify(this.name, { lower: true, strict: true }) + '-' + Date.now().toString(36);
  }
  next();
});

module.exports = mongoose.model('Organization', organizationSchema);
