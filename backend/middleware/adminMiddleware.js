const Organization = require('../models/Organization');

/**
 * Admin middleware — allows access only to:
 *  1. The organization owner, OR
 *  2. Members with role: 'admin' in the organization
 */
const adminMiddleware = async (req, res, next) => {
  try {
    const org = await Organization.findById(req.user.organizationId);

    if (!org) {
      return res.status(403).json({ message: 'Organization not found' });
    }

    // Check if user is the org owner
    const isOwner = org.owner.toString() === req.user._id.toString();

    // Check if user is an admin member
    const memberEntry = org.members.find(
      (m) => m.user && m.user.toString() === req.user._id.toString()
    );
    const isAdminMember = memberEntry?.role === 'admin';

    if (!isOwner && !isAdminMember) {
      return res.status(403).json({ message: 'Access denied: admin only' });
    }

    req.org = org; // attach org to request for downstream use
    next();
  } catch (error) {
    res.status(500).json({ message: 'Admin check failed', error: error.message });
  }
};

module.exports = adminMiddleware;
