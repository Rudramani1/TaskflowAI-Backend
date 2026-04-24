const Sprint = require('../models/Sprint');
const Task = require('../models/Task');
const SprintHistory = require('../models/SprintHistory');
const Notification = require('../models/Notification');
const ActivityLog = require('../models/ActivityLog');
const { broadcast } = require('../services/sse');
const aiEngine = require('../services/ai-engine');

// @route GET /api/sprints?projectId=
exports.getSprints = async (req, res, next) => {
  try {
    const { projectId } = req.query;
    const filter = { orgId: req.user.organizationId };
    if (projectId) filter.projectId = projectId;

    const sprints = await Sprint.find(filter).sort({ startDate: -1 });
    res.json(sprints);
  } catch (error) { next(error); }
};

// @route GET /api/sprints/:id
exports.getSprint = async (req, res, next) => {
  try {
    const sprint = await Sprint.findById(req.params.id);
    if (!sprint) return res.status(404).json({ message: 'Sprint not found' });
    res.json(sprint);
  } catch (error) { next(error); }
};

// @route POST /api/sprints
exports.createSprint = async (req, res, next) => {
  try {
    const { projectId, name, goal, startDate, endDate } = req.body;
    const sprint = await Sprint.create({
      orgId: req.user.organizationId,
      projectId,
      name,
      goal,
      startDate,
      endDate
    });

    broadcast(req.user.organizationId, 'sprint_created', sprint);
    res.status(201).json(sprint);
  } catch (error) { next(error); }
};

// @route PUT /api/sprints/:id
exports.updateSprint = async (req, res, next) => {
  try {
    const sprint = await Sprint.findByIdAndUpdate(req.params.id, req.body, { new: true, runValidators: true });
    if (!sprint) return res.status(404).json({ message: 'Sprint not found' });

    broadcast(req.user.organizationId, 'sprint_updated', sprint);
    res.json(sprint);
  } catch (error) { next(error); }
};

// @route POST /api/sprints/:id/close
exports.closeSprint = async (req, res, next) => {
  try {
    const sprint = await Sprint.findById(req.params.id);
    if (!sprint) return res.status(404).json({ message: 'Sprint not found' });

    const tasks = await Task.find({ sprintId: sprint._id, organizationId: req.user.organizationId });
    const completedTasks = tasks.filter(t => t.status === 'done');
    const incompleteTasks = tasks.filter(t => t.status !== 'done');

    const plannedPoints = tasks.reduce((s, t) => s + (t.storyPoints || 0), 0);
    const completedPoints = completedTasks.reduce((s, t) => s + (t.storyPoints || 0), 0);

    // Calculate member stats
    const memberMap = {};
    completedTasks.forEach(t => {
      if (t.assigneeId) {
        const id = t.assigneeId.toString();
        if (!memberMap[id]) memberMap[id] = { userId: t.assigneeId, pointsCompleted: 0, tasksCompleted: 0 };
        memberMap[id].pointsCompleted += t.storyPoints || 0;
        memberMap[id].tasksCompleted += 1;
      }
    });

    // Write SprintHistory
    const retro = await aiEngine.generateRetrospective(req.user.organizationId, sprint._id);

    const history = await SprintHistory.create({
      orgId: req.user.organizationId,
      sprintId: sprint._id,
      projectId: sprint.projectId,
      plannedPoints,
      completedPoints,
      memberStats: Object.values(memberMap),
      retrospectiveSummary: retro.summary
    });

    // Handle incomplete tasks based on request body
    const { moveAction, nextSprintId } = req.body;
    if (moveAction === 'next' && nextSprintId) {
      await Task.updateMany(
        { _id: { $in: incompleteTasks.map(t => t._id) } },
        { sprintId: nextSprintId }
      );
    } else {
      // Move to backlog by default
      await Task.updateMany(
        { _id: { $in: incompleteTasks.map(t => t._id) } },
        { sprintId: null }
      );
    }

    // Mark sprint complete
    sprint.status = 'complete';
    sprint.velocityPoints = completedPoints;
    await sprint.save();

    // Train AI models with new data
    await aiEngine.trainModels(req.user.organizationId);

    broadcast(req.user.organizationId, 'sprint_closed', { sprint, history });

    res.json({
      sprint,
      history,
      completedTasks: completedTasks.length,
      movedTasks: incompleteTasks.length,
      retrospective: retro.summary
    });
  } catch (error) { next(error); }
};

// @route GET /api/sprints/:id/burndown
exports.getBurndown = async (req, res, next) => {
  try {
    const sprint = await Sprint.findById(req.params.id);
    if (!sprint) return res.status(404).json({ message: 'Sprint not found' });

    const tasks = await Task.find({ sprintId: sprint._id, organizationId: req.user.organizationId });
    const totalPoints = tasks.reduce((s, t) => s + (t.storyPoints || 0), 0);
    const totalTasks = tasks.length;

    const startDate = new Date(sprint.startDate);
    const endDate = new Date(sprint.endDate);
    const totalDays = Math.max(1, Math.ceil((endDate - startDate) / (1000 * 60 * 60 * 24)));

    const burndownData = [];

    for (let i = 0; i <= totalDays; i++) {
      const date = new Date(startDate);
      date.setDate(date.getDate() + i);

      // Remaining points: total minus tasks completed before this date
      const completedByDate = tasks.filter(t =>
        t.status === 'done' && t.completedAt && new Date(t.completedAt) <= date
      );
      const completedPoints = completedByDate.reduce((s, t) => s + (t.storyPoints || 0), 0);

      // Ideal line: linear from total to 0
      const idealRemaining = totalPoints - (totalPoints * (i / totalDays));

      burndownData.push({
        date: date.toISOString().split('T')[0],
        day: i,
        idealRemaining: Math.round(idealRemaining * 10) / 10,
        actualRemaining: totalPoints - completedPoints,
        completedPoints,
        completedTasks: completedByDate.length
      });
    }

    res.json({
      burndown: burndownData,
      totalPoints,
      totalTasks,
      sprint: { name: sprint.name, startDate: sprint.startDate, endDate: sprint.endDate }
    });
  } catch (error) { next(error); }
};
