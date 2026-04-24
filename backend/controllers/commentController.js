const Comment = require('../models/Comment');
const Notification = require('../models/Notification');
const User = require('../models/User');
const ActivityLog = require('../models/ActivityLog');
const { broadcast } = require('../services/sse');

// @route POST /api/comments
exports.createComment = async (req, res, next) => {
  try {
    const { taskId, body } = req.body;
    const orgId = req.user.organizationId;

    // Parse @mentions
    const mentionRegex = /@(\w+[\w\s]*\w+)/g;
    const mentionNames = [];
    let match;
    while ((match = mentionRegex.exec(body)) !== null) {
      mentionNames.push(match[1].trim());
    }

    // Find mentioned users
    const mentionedUsers = mentionNames.length > 0
      ? await User.find({ name: { $in: mentionNames.map(n => new RegExp(`^${n}$`, 'i')) }, organizationId: orgId })
      : [];

    const comment = await Comment.create({
      taskId,
      orgId,
      authorId: req.user._id,
      body,
      mentions: mentionedUsers.map(u => u._id)
    });

    // Create notifications for mentioned users
    for (const user of mentionedUsers) {
      if (user._id.toString() !== req.user._id.toString()) {
        await Notification.create({
          orgId,
          userId: user._id,
          type: 'mentioned',
          entityId: taskId,
          entityType: 'task',
          message: `${req.user.name} mentioned you in a comment`
        });
      }
    }

    // Log activity
    await ActivityLog.create({
      orgId,
      taskId,
      actorId: req.user._id,
      action: 'commented',
      diff: { commentId: comment._id }
    });

    const populated = await Comment.findById(comment._id).populate('authorId', 'name email avatar');
    
    broadcast(orgId, 'comment_added', { taskId, comment: populated });
    res.status(201).json(populated);
  } catch (error) { next(error); }
};

// @route GET /api/comments?taskId=
exports.getComments = async (req, res, next) => {
  try {
    const { taskId } = req.query;
    const comments = await Comment.find({ taskId, orgId: req.user.organizationId })
      .populate('authorId', 'name email avatar')
      .sort({ createdAt: 1 });
    res.json(comments);
  } catch (error) { next(error); }
};

// @route DELETE /api/comments/:id
exports.deleteComment = async (req, res, next) => {
  try {
    const comment = await Comment.findById(req.params.id);
    if (!comment) return res.status(404).json({ message: 'Comment not found' });
    if (comment.authorId.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: 'Not authorized' });
    }
    await Comment.findByIdAndDelete(req.params.id);
    res.json({ message: 'Comment deleted' });
  } catch (error) { next(error); }
};
