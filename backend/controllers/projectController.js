const Project = require('../models/Project');
const Task = require('../models/Task');

// @route GET /api/projects
exports.getProjects = async (req, res, next) => {
  try {
    const projects = await Project.find({ organizationId: req.user.organizationId })
      .populate('owner', 'name email avatar')
      .populate('members.userId', 'name email avatar')
      .sort({ createdAt: -1 });

    const projectsWithCounts = await Promise.all(
      projects.map(async (project) => {
        const taskStats = await Task.aggregate([
          { $match: { projectId: project._id } },
          { $group: { _id: '$status', count: { $sum: 1 } } }
        ]);
        return { ...project.toObject(), taskStats: taskStats.reduce((acc, s) => ({ ...acc, [s._id]: s.count }), {}) };
      })
    );

    res.json(projectsWithCounts);
  } catch (error) { next(error); }
};

// @route GET /api/projects/:id
exports.getProject = async (req, res, next) => {
  try {
    const project = await Project.findById(req.params.id)
      .populate('owner', 'name email avatar')
      .populate('members.userId', 'name email avatar');
    if (!project) return res.status(404).json({ message: 'Project not found' });
    res.json(project);
  } catch (error) { next(error); }
};

// @route POST /api/projects
exports.createProject = async (req, res, next) => {
  try {
    const { name, description, key, color, visibility } = req.body;
    const project = await Project.create({
      name, description, color: color || '#6366f1',
      visibility: visibility || 'public',
      key: key || name.substring(0, 3).toUpperCase(),
      organizationId: req.user.organizationId,
      owner: req.user._id,
      members: [{ userId: req.user._id, role: 'admin' }]
    });
    const populated = await Project.findById(project._id)
      .populate('owner', 'name email avatar')
      .populate('members.userId', 'name email avatar');
    res.status(201).json(populated);
  } catch (error) { next(error); }
};

// @route PUT /api/projects/:id
exports.updateProject = async (req, res, next) => {
  try {
    if (req.body.status === 'archived') req.body.archivedAt = new Date();
    const project = await Project.findByIdAndUpdate(req.params.id, req.body, { new: true, runValidators: true })
      .populate('owner', 'name email avatar')
      .populate('members.userId', 'name email avatar');
    if (!project) return res.status(404).json({ message: 'Project not found' });
    res.json(project);
  } catch (error) { next(error); }
};

// @route DELETE /api/projects/:id
exports.deleteProject = async (req, res, next) => {
  try {
    const project = await Project.findById(req.params.id);
    if (!project) return res.status(404).json({ message: 'Project not found' });
    await Task.deleteMany({ projectId: project._id });
    await Project.findByIdAndDelete(req.params.id);
    res.json({ message: 'Project and all related tasks deleted' });
  } catch (error) { next(error); }
};

// @route POST /api/projects/:id/members
exports.addMember = async (req, res, next) => {
  try {
    const { userId, role } = req.body;
    const project = await Project.findById(req.params.id);
    if (!project) return res.status(404).json({ message: 'Project not found' });

    const existing = project.members.find(m => m.userId?.toString() === userId);
    if (existing) {
      existing.role = role || existing.role;
    } else {
      project.members.push({ userId, role: role || 'member' });
    }
    await project.save();

    const populated = await Project.findById(project._id).populate('members.userId', 'name email avatar');
    res.json(populated);
  } catch (error) { next(error); }
};

// @route GET /api/projects/:id/stats
exports.getProjectStats = async (req, res, next) => {
  try {
    const projectId = req.params.id;
    const mongoose = require('mongoose');
    const [taskStats, recentTasks] = await Promise.all([
      Task.aggregate([
        { $match: { projectId: new mongoose.Types.ObjectId(projectId) } },
        { $group: { _id: '$status', count: { $sum: 1 } } }
      ]),
      Task.find({ projectId }).sort({ updatedAt: -1 }).limit(10).populate('assigneeId', 'name avatar')
    ]);

    const totalTasks = taskStats.reduce((sum, s) => sum + s.count, 0);
    const completedTasks = taskStats.find(s => s._id === 'done')?.count || 0;
    const progress = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;

    res.json({
      taskStats: taskStats.reduce((acc, s) => ({ ...acc, [s._id]: s.count }), {}),
      totalTasks, completedTasks, progress, recentTasks
    });
  } catch (error) { next(error); }
};
