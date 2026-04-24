const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const { validationResult } = require('express-validator');
const User = require('../models/User');
const Organization = require('../models/Organization');
const { sendInviteEmail } = require('../services/email');

const generateAccessToken = (id) => {
  return jwt.sign({ id }, process.env.JWT_SECRET, { expiresIn: '15m' });
};

const generateRefreshToken = (id) => {
  return jwt.sign({ id, type: 'refresh' }, process.env.JWT_SECRET, { expiresIn: '30d' });
};

// @route POST /api/auth/signup
exports.signup = async (req, res, next) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });

    const { name, email, password, organizationName } = req.body;

    const existingUser = await User.findOne({ email });
    if (existingUser) return res.status(400).json({ message: 'User already exists with this email' });

    const user = await User.create({ name, email, password });

    let organization = null;
    if (organizationName) {
      organization = await Organization.create({
        name: organizationName,
        owner: user._id,
        members: [{ user: user._id, role: 'admin' }]
      });
      user.organizationId = organization._id;
      await user.save();
    }

    const accessToken = generateAccessToken(user._id);
    const refreshToken = generateRefreshToken(user._id);
    user.refreshToken = refreshToken;
    await User.findByIdAndUpdate(user._id, { refreshToken });

    res.status(201).json({
      accessToken,
      refreshToken,
      user: { id: user._id, name: user.name, email: user.email, organizationId: user.organizationId, avatar: user.avatar },
      organization
    });
  } catch (error) { next(error); }
};

// @route POST /api/auth/login
exports.login = async (req, res, next) => {
  try {
    const { email, password } = req.body;

    const user = await User.findOne({ email }).select('+password');
    if (!user) return res.status(401).json({ message: 'Invalid email or password' });
    if (!user.password) return res.status(401).json({ message: 'Please use Google sign-in for this account' });

    const isMatch = await user.comparePassword(password);
    if (!isMatch) return res.status(401).json({ message: 'Invalid email or password' });

    const accessToken = generateAccessToken(user._id);
    const refreshToken = generateRefreshToken(user._id);
    await User.findByIdAndUpdate(user._id, { refreshToken });

    const organization = await Organization.findById(user.organizationId);

    // Get user role from org membership
    const member = organization?.members?.find(m => m.user.toString() === user._id.toString());
    const role = member?.role || 'member';

    res.json({
      accessToken,
      refreshToken,
      user: { id: user._id, name: user.name, email: user.email, role, organizationId: user.organizationId, avatar: user.avatar },
      organization
    });
  } catch (error) { next(error); }
};

// @route POST /api/auth/refresh
exports.refreshToken = async (req, res, next) => {
  try {
    const { refreshToken } = req.body;
    if (!refreshToken) return res.status(401).json({ message: 'Refresh token required' });

    const decoded = jwt.verify(refreshToken, process.env.JWT_SECRET);
    if (decoded.type !== 'refresh') return res.status(401).json({ message: 'Invalid token type' });

    const user = await User.findById(decoded.id).select('+refreshToken');
    if (!user || user.refreshToken !== refreshToken) {
      return res.status(401).json({ message: 'Invalid refresh token' });
    }

    const newAccessToken = generateAccessToken(user._id);
    const newRefreshToken = generateRefreshToken(user._id);
    await User.findByIdAndUpdate(user._id, { refreshToken: newRefreshToken });

    res.json({ accessToken: newAccessToken, refreshToken: newRefreshToken });
  } catch (error) {
    res.status(401).json({ message: 'Invalid or expired refresh token' });
  }
};

// @route GET /api/auth/me
exports.getProfile = async (req, res, next) => {
  try {
    const user = await User.findById(req.user._id);
    const organization = await Organization.findById(user.organizationId);
    const member = organization?.members?.find(m => m.user.toString() === user._id.toString());
    const role = member?.role || 'member';

    res.json({
      user: { id: user._id, name: user.name, email: user.email, role, organizationId: user.organizationId, avatar: user.avatar },
      organization
    });
  } catch (error) { next(error); }
};

// @route PUT /api/auth/profile
exports.updateProfile = async (req, res, next) => {
  try {
    const { name, avatar } = req.body;
    const user = await User.findByIdAndUpdate(req.user._id, { name, avatar }, { new: true, runValidators: true });
    res.json({ user: { id: user._id, name: user.name, email: user.email, organizationId: user.organizationId, avatar: user.avatar } });
  } catch (error) { next(error); }
};

// @route POST /api/auth/organization
exports.createOrganization = async (req, res, next) => {
  try {
    const { name, description } = req.body;
    const organization = await Organization.create({
      name, description,
      owner: req.user._id,
      members: [{ user: req.user._id, role: 'admin' }]
    });
    await User.findByIdAndUpdate(req.user._id, { organizationId: organization._id });
    res.status(201).json(organization);
  } catch (error) { next(error); }
};

// @route POST /api/auth/invite
exports.inviteMember = async (req, res, next) => {
  try {
    const { email, role } = req.body;
    const org = await Organization.findById(req.user.organizationId);
    if (!org) return res.status(404).json({ message: 'Organization not found' });

    const alreadyInvited = org.invites.find(inv => inv.email === email && inv.status === 'pending');
    if (alreadyInvited) return res.status(400).json({ message: 'User already invited' });

    // Generate signed invite token
    const inviteToken = jwt.sign(
      { orgId: org._id, email, role: role || 'member' },
      process.env.JWT_SECRET,
      { expiresIn: '7d' }
    );

    org.invites.push({ email, role: role || 'member', token: inviteToken });
    await org.save();

    const inviteLink = `${process.env.CLIENT_URL || 'http://localhost:5173'}/invite/${inviteToken}`;
    await sendInviteEmail(email, org.name, inviteLink);

    res.json({ message: 'Invitation sent', inviteLink, organization: org });
  } catch (error) { next(error); }
};

// @route POST /api/auth/join/:token
exports.joinOrganization = async (req, res, next) => {
  try {
    const { token } = req.params;
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const { orgId, email, role } = decoded;

    const org = await Organization.findById(orgId);
    if (!org) return res.status(404).json({ message: 'Organization not found' });

    // Use the logged-in user if available, otherwise find by invite email
    let user = req.user || await User.findOne({ email });
    if (!user) {
      return res.status(400).json({
        message: 'Please sign up first, then use this invite link',
        needsSignup: true,
        signupUrl: `/signup?invite=${token}&email=${encodeURIComponent(email)}`
      });
    }

    // Add user to org
    const alreadyMember = org.members.find(m => m.user.toString() === user._id.toString());
    if (alreadyMember) {
      return res.json({ message: 'You are already a member of this organization', organization: org });
    }

    org.members.push({ user: user._id, role });
    // Update invite status
    const invite = org.invites.find(inv => inv.email === email && inv.status === 'pending');
    if (invite) invite.status = 'accepted';
    // Also mark if the logged-in user's email matches a different invite
    if (req.user) {
      const userInvite = org.invites.find(inv => inv.email === req.user.email && inv.status === 'pending');
      if (userInvite) userInvite.status = 'accepted';
    }
    await org.save();

    user.organizationId = org._id;
    await user.save();

    res.json({ message: 'Joined organization successfully', organization: org });
  } catch (error) {
    if (error.name === 'JsonWebTokenError' || error.name === 'TokenExpiredError') {
      return res.status(400).json({ message: 'Invalid or expired invite link' });
    }
    next(error);
  }
};

// @route GET /api/auth/members
exports.getMembers = async (req, res, next) => {
  try {
    const org = await Organization.findById(req.user.organizationId)
      .populate('members.user', 'name email avatar isOnline lastSeen');
    if (!org) return res.status(404).json({ message: 'Organization not found' });
    res.json({ members: org.members, invites: org.invites });
  } catch (error) { next(error); }
};

// @route GET /api/auth/invite/:token/info
exports.getInviteInfo = async (req, res, next) => {
  try {
    const decoded = jwt.verify(req.params.token, process.env.JWT_SECRET);
    const org = await Organization.findById(decoded.orgId);
    if (!org) return res.status(404).json({ message: 'Organization not found' });
    res.json({ organizationName: org.name, email: decoded.email, role: decoded.role });
  } catch (error) {
    res.status(400).json({ message: 'Invalid or expired invite link' });
  }
};
