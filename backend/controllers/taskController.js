const Task = require('../models/Task');
const Project = require('../models/Project');
const ActivityLog = require('../models/ActivityLog');
const Notification = require('../models/Notification');
const { broadcast } = require('../services/sse');

// @route GET /api/tasks?projectId=xxx
exports.getTasks = async (req, res, next) => {
  try {
    const { projectId, status, assigneeId, priority, sprintId, search, label } = req.query;
    const filter = { organizationId: req.user.organizationId };

    if (projectId) filter.projectId = projectId;
    if (status) filter.status = status;
    if (assigneeId) filter.assigneeId = assigneeId;
    if (priority) filter.priority = priority;
    if (sprintId === 'null' || sprintId === 'backlog') filter.sprintId = null;
    else if (sprintId) filter.sprintId = sprintId;
    if (label) filter.labels = label;
    if (search) {
      filter.$or = [
        { title: { $regex: search, $options: 'i' } },
        { taskKey: { $regex: search, $options: 'i' } }
      ];
    }

    const tasks = await Task.find(filter)
      .populate('assigneeId', 'name email avatar')
      .populate('createdBy', 'name email avatar')
      .sort({ order: 1, createdAt: -1 });

    res.json(tasks);
  } catch (error) { next(error); }
};

// @route GET /api/tasks/:id
exports.getTask = async (req, res, next) => {
  try {
    const task = await Task.findById(req.params.id)
      .populate('assigneeId', 'name email avatar')
      .populate('createdBy', 'name email avatar');

    if (!task) return res.status(404).json({ message: 'Task not found' });
    res.json(task);
  } catch (error) { next(error); }
};

// @route POST /api/tasks
exports.createTask = async (req, res, next) => {
  try {
    const { title, description, projectId, assigneeId, priority, status, labels, dueDate, sprintId, storyPoints } = req.body;

    const project = await Project.findById(projectId);
    if (!project) return res.status(404).json({ message: 'Project not found' });

    project.taskCount = (project.taskCount || 0) + 1;
    await project.save();

    const taskKey = `${project.key}-${project.taskCount}`;

    const task = await Task.create({
      title, description, taskKey, projectId,
      organizationId: req.user.organizationId,
      assigneeId: assigneeId || null,
      createdBy: req.user._id,
      priority: priority || 'p2',
      status: status || 'todo',
      labels: labels || [],
      dueDate, sprintId: sprintId || null,
      storyPoints: storyPoints || null
    });

    // Log activity
    await ActivityLog.create({
      orgId: req.user.organizationId,
      taskId: task._id,
      actorId: req.user._id,
      action: 'created',
      diff: { title }
    });

    // Notify assignee
    if (assigneeId && assigneeId !== req.user._id.toString()) {
      await Notification.create({
        orgId: req.user.organizationId,
        userId: assigneeId,
        type: 'assigned',
        entityId: task._id,
        entityType: 'task',
        message: `${req.user.name} assigned you to "${title}"`
      });
    }

    const populatedTask = await Task.findById(task._id)
      .populate('assigneeId', 'name email avatar')
      .populate('createdBy', 'name email avatar');

    broadcast(req.user.organizationId, 'task_created', populatedTask);
    res.status(201).json(populatedTask);
  } catch (error) { next(error); }
};

// @route PUT /api/tasks/:id
exports.updateTask = async (req, res, next) => {
  try {
    const oldTask = await Task.findById(req.params.id);
    if (!oldTask) return res.status(404).json({ message: 'Task not found' });

    // Build activity log entries
    const changes = {};
    const trackFields = ['title', 'description', 'assigneeId', 'priority', 'status', 'labels', 'dueDate', 'sprintId', 'storyPoints'];
    trackFields.forEach(field => {
      if (req.body[field] !== undefined && String(req.body[field]) !== String(oldTask[field])) {
        changes[field] = { from: oldTask[field], to: req.body[field] };
      }
    });

    if (Object.keys(changes).length > 0) {
      const action = changes.status ? 'status_changed' : changes.assigneeId ? 'assigned' : changes.priority ? 'priority_changed' : 'updated';
      await ActivityLog.create({
        orgId: req.user.organizationId,
        taskId: oldTask._id,
        actorId: req.user._id,
        action,
        diff: changes
      });
    }

    // Notify on assignment change
    if (changes.assigneeId && req.body.assigneeId && req.body.assigneeId !== req.user._id.toString()) {
      await Notification.create({
        orgId: req.user.organizationId,
        userId: req.body.assigneeId,
        type: 'assigned',
        entityId: oldTask._id,
        entityType: 'task',
        message: `${req.user.name} assigned you to "${oldTask.title}"`
      });
    }

    const task = await Task.findByIdAndUpdate(req.params.id, req.body, { new: true, runValidators: true })
      .populate('assigneeId', 'name email avatar')
      .populate('createdBy', 'name email avatar');

    broadcast(req.user.organizationId, 'task_updated', task);
    res.json(task);
  } catch (error) { next(error); }
};

// @route DELETE /api/tasks/:id
exports.deleteTask = async (req, res, next) => {
  try {
    const task = await Task.findById(req.params.id);
    if (!task) return res.status(404).json({ message: 'Task not found' });

    await ActivityLog.create({
      orgId: req.user.organizationId,
      taskId: task._id,
      actorId: req.user._id,
      action: 'deleted',
      diff: { title: task.title }
    });

    await Task.findByIdAndDelete(req.params.id);
    broadcast(req.user.organizationId, 'task_deleted', { taskId: req.params.id });
    res.json({ message: 'Task deleted successfully' });
  } catch (error) { next(error); }
};

// @route PUT /api/tasks/:id/subtasks
exports.updateSubtasks = async (req, res, next) => {
  try {
    const { subtasks } = req.body;
    const task = await Task.findByIdAndUpdate(req.params.id, { subtasks }, { new: true });
    if (!task) return res.status(404).json({ message: 'Task not found' });
    res.json(task);
  } catch (error) { next(error); }
};

// @route PUT /api/tasks/:id/checklist
exports.updateChecklist = async (req, res, next) => {
  try {
    const { checklist } = req.body;
    const task = await Task.findByIdAndUpdate(req.params.id, { checklist }, { new: true });
    if (!task) return res.status(404).json({ message: 'Task not found' });
    res.json(task);
  } catch (error) { next(error); }
};

// @route PATCH /api/tasks/reorder
exports.reorderTasks = async (req, res, next) => {
  try {
    const { tasks } = req.body;
    const bulkOps = tasks.map(t => ({
      updateOne: {
        filter: { _id: t.id },
        update: { status: t.status, order: t.order }
      }
    }));
    await Task.bulkWrite(bulkOps);
    broadcast(req.user.organizationId, 'tasks_reordered', tasks);
    res.json({ message: 'Tasks reordered' });
  } catch (error) { next(error); }
};

// @route GET /api/tasks/:id/activity
exports.getTaskActivity = async (req, res, next) => {
  try {
    const logs = await ActivityLog.find({ taskId: req.params.id })
      .populate('actorId', 'name email avatar')
      .sort({ createdAt: -1 })
      .limit(50);
    res.json(logs);
  } catch (error) { next(error); }
};
