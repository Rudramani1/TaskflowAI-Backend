const mongoose = require('mongoose');
const dotenv = require('dotenv');
dotenv.config();

const User = require('../models/User');
const Organization = require('../models/Organization');
const Project = require('../models/Project');
const Task = require('../models/Task');
const Sprint = require('../models/Sprint');
const SprintHistory = require('../models/SprintHistory');
const Comment = require('../models/Comment');
const ActivityLog = require('../models/ActivityLog');
const Notification = require('../models/Notification');
const AIModel = require('../models/AIModel');
const AIPredictionLog = require('../models/AIPredictionLog');

async function seed() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('Connected to MongoDB for seeding...\n');

    // Clear ALL data
    await Promise.all([
      User.deleteMany({}), Organization.deleteMany({}), Project.deleteMany({}),
      Task.deleteMany({}), Sprint.deleteMany({}), SprintHistory.deleteMany({}),
      Comment.deleteMany({}), ActivityLog.deleteMany({}), Notification.deleteMany({}),
      AIModel.deleteMany({}), AIPredictionLog.deleteMany({})
    ]);
    console.log('✓ Cleared existing data');

    // ── Create Users ──
    const users = await User.create([
      { name: 'Sandeep Kumar', email: 'sandeep@taskflow.ai', password: 'password123' },
      { name: 'Priya Sharma', email: 'priya@taskflow.ai', password: 'password123' },
      { name: 'Rahul Verma', email: 'rahul@taskflow.ai', password: 'password123' },
      { name: 'Anita Singh', email: 'anita@taskflow.ai', password: 'password123' }
    ]);
    console.log('✓ Created 4 users');

    // ── Create Organization ──
    const org = await Organization.create({
      name: 'TaskFlow Team',
      owner: users[0]._id,
      description: 'Default demo organization for TaskFlow AI',
      members: [
        { user: users[0]._id, role: 'admin' },
        { user: users[1]._id, role: 'member' },
        { user: users[2]._id, role: 'member' },
        { user: users[3]._id, role: 'guest' }
      ]
    });
    await Promise.all(users.map(u => User.findByIdAndUpdate(u._id, { organizationId: org._id })));
    console.log('✓ Created organization:', org.slug);

    // ── Create Projects ──
    const projects = await Project.create([
      {
        name: 'TaskFlow Platform', description: 'Build the TaskFlow AI project management platform',
        key: 'TFP', organizationId: org._id, owner: users[0]._id, color: '#6366f1',
        members: users.map(u => ({ userId: u._id, role: u._id.equals(users[0]._id) ? 'admin' : 'member' })),
        taskCount: 16
      },
      {
        name: 'Mobile App', description: 'TaskFlow mobile companion app',
        key: 'MOB', organizationId: org._id, owner: users[1]._id, color: '#10b981',
        members: [
          { userId: users[0]._id, role: 'admin' },
          { userId: users[1]._id, role: 'admin' },
          { userId: users[3]._id, role: 'member' }
        ],
        taskCount: 4
      }
    ]);
    console.log('✓ Created 2 projects');

    // ── Create Sprints ──
    const now = new Date();
    const sprints = await Sprint.create([
      // Completed sprints (for AI training data)
      {
        orgId: org._id, projectId: projects[0]._id,
        name: 'Sprint 1 — Foundation', goal: 'Setup infrastructure and auth',
        startDate: new Date(now.getTime() - 42 * 86400000), endDate: new Date(now.getTime() - 28 * 86400000),
        status: 'complete', velocityPoints: 28
      },
      {
        orgId: org._id, projectId: projects[0]._id,
        name: 'Sprint 2 — Core Features', goal: 'Project & task management',
        startDate: new Date(now.getTime() - 28 * 86400000), endDate: new Date(now.getTime() - 14 * 86400000),
        status: 'complete', velocityPoints: 32
      },
      {
        orgId: org._id, projectId: projects[0]._id,
        name: 'Sprint 3 — UI Polish', goal: 'Dashboard and board refinement',
        startDate: new Date(now.getTime() - 14 * 86400000), endDate: new Date(now.getTime()),
        status: 'complete', velocityPoints: 25
      },
      // Active sprint
      {
        orgId: org._id, projectId: projects[0]._id,
        name: 'Sprint 4 — AI & Collaboration', goal: 'AI dashboard and real-time features',
        startDate: new Date(now.getTime()), endDate: new Date(now.getTime() + 14 * 86400000),
        status: 'active'
      },
      // Planned sprint
      {
        orgId: org._id, projectId: projects[0]._id,
        name: 'Sprint 5 — Polish & Ship', goal: 'Final polish and deployment',
        startDate: new Date(now.getTime() + 14 * 86400000), endDate: new Date(now.getTime() + 28 * 86400000),
        status: 'planned'
      }
    ]);
    console.log('✓ Created 5 sprints (3 complete, 1 active, 1 planned)');

    // ── Create Tasks ──
    const activeSprint = sprints[3];
    const tasks = await Task.create([
      // Sprint 1 tasks (all done)
      { title: 'Setup project structure', description: 'Initialize React+Vite frontend and Express backend with MongoDB connection.', taskKey: 'TFP-1', projectId: projects[0]._id, organizationId: org._id, assigneeId: users[0]._id, createdBy: users[0]._id, priority: 'p0', status: 'done', sprintId: sprints[0]._id, labels: ['setup'], storyPoints: 5, dueDate: new Date(now.getTime() - 40 * 86400000), completedAt: new Date(now.getTime() - 39 * 86400000), subtasks: [{ title: 'Init React with Vite', completed: true }, { title: 'Setup Express server', completed: true }, { title: 'Configure MongoDB', completed: true }] },
      { title: 'Implement JWT authentication', description: 'Signup, login, protected routes with access+refresh tokens.', taskKey: 'TFP-2', projectId: projects[0]._id, organizationId: org._id, assigneeId: users[0]._id, createdBy: users[0]._id, priority: 'p0', status: 'done', sprintId: sprints[0]._id, labels: ['auth', 'security'], storyPoints: 8, dueDate: new Date(now.getTime() - 35 * 86400000), completedAt: new Date(now.getTime() - 34 * 86400000) },
      { title: 'Organization & team setup', description: 'Org creation, member invites, role management.', taskKey: 'TFP-3', projectId: projects[0]._id, organizationId: org._id, assigneeId: users[1]._id, createdBy: users[0]._id, priority: 'p1', status: 'done', sprintId: sprints[0]._id, labels: ['org'], storyPoints: 8, dueDate: new Date(now.getTime() - 30 * 86400000), completedAt: new Date(now.getTime() - 31 * 86400000) },
      { title: 'Database schema design', description: 'Design and implement all Mongoose models.', taskKey: 'TFP-4', projectId: projects[0]._id, organizationId: org._id, assigneeId: users[0]._id, createdBy: users[0]._id, priority: 'p1', status: 'done', sprintId: sprints[0]._id, labels: ['database'], storyPoints: 5, completedAt: new Date(now.getTime() - 33 * 86400000) },
      // Sprint 2 tasks (all done)
      { title: 'Project CRUD API', description: 'Full REST API for projects with members, stats.', taskKey: 'TFP-5', projectId: projects[0]._id, organizationId: org._id, assigneeId: users[0]._id, createdBy: users[0]._id, priority: 'p1', status: 'done', sprintId: sprints[1]._id, labels: ['api'], storyPoints: 5, completedAt: new Date(now.getTime() - 25 * 86400000) },
      { title: 'Task CRUD API', description: 'Tasks with filtering, sorting, status management.', taskKey: 'TFP-6', projectId: projects[0]._id, organizationId: org._id, assigneeId: users[2]._id, createdBy: users[0]._id, priority: 'p0', status: 'done', sprintId: sprints[1]._id, labels: ['api'], storyPoints: 8, completedAt: new Date(now.getTime() - 22 * 86400000) },
      { title: 'Build Kanban board', description: 'Drag-and-drop board with dnd-kit.', taskKey: 'TFP-7', projectId: projects[0]._id, organizationId: org._id, assigneeId: users[2]._id, createdBy: users[0]._id, priority: 'p0', status: 'done', sprintId: sprints[1]._id, labels: ['ui', 'kanban'], storyPoints: 13, completedAt: new Date(now.getTime() - 18 * 86400000) },
      { title: 'Task detail panel', description: 'Slide-in panel with all fields, subtasks, checklist.', taskKey: 'TFP-8', projectId: projects[0]._id, organizationId: org._id, assigneeId: users[1]._id, createdBy: users[0]._id, priority: 'p1', status: 'done', sprintId: sprints[1]._id, labels: ['ui'], storyPoints: 5, completedAt: new Date(now.getTime() - 16 * 86400000) },
      // Sprint 3 tasks (mostly done, some carried over)
      { title: 'Design dashboard UI', description: 'Stats cards, AI insights panel, workload chart.', taskKey: 'TFP-9', projectId: projects[0]._id, organizationId: org._id, assigneeId: users[1]._id, createdBy: users[0]._id, priority: 'p1', status: 'done', sprintId: sprints[2]._id, labels: ['ui', 'dashboard'], storyPoints: 8, completedAt: new Date(now.getTime() - 5 * 86400000), checklist: [{ text: 'Stats cards', checked: true }, { text: 'Activity feed', checked: true }, { text: 'Charts', checked: true }] },
      { title: 'List view with inline editing', description: 'Sortable table view with inline status changes.', taskKey: 'TFP-10', projectId: projects[0]._id, organizationId: org._id, assigneeId: users[2]._id, createdBy: users[0]._id, priority: 'p2', status: 'done', sprintId: sprints[2]._id, labels: ['ui'], storyPoints: 5, completedAt: new Date(now.getTime() - 3 * 86400000) },
      { title: 'Filter & search bar', description: 'Filter by status, priority, assignee.', taskKey: 'TFP-11', projectId: projects[0]._id, organizationId: org._id, assigneeId: users[2]._id, createdBy: users[0]._id, priority: 'p2', status: 'done', sprintId: sprints[2]._id, labels: ['ui'], storyPoints: 3, completedAt: new Date(now.getTime() - 2 * 86400000) },
      // Current sprint tasks (mixed statuses)
      { title: 'AI insights panel', description: 'Build AI dashboard with risk scores, predictions, suggestions. Integrate the self-learning engine.', taskKey: 'TFP-12', projectId: projects[0]._id, organizationId: org._id, assigneeId: users[1]._id, createdBy: users[0]._id, priority: 'p0', status: 'in_progress', sprintId: activeSprint._id, labels: ['ai', 'dashboard'], storyPoints: 13, dueDate: new Date(now.getTime() + 5 * 86400000) },
      { title: 'Sprint management UI', description: 'Create sprint flow, burndown chart, sprint close dialog.', taskKey: 'TFP-13', projectId: projects[0]._id, organizationId: org._id, assigneeId: users[0]._id, createdBy: users[0]._id, priority: 'p0', status: 'in_progress', sprintId: activeSprint._id, labels: ['sprint', 'ui'], storyPoints: 8, dueDate: new Date(now.getTime() + 7 * 86400000) },
      { title: 'Comment system with @mentions', description: 'Markdown comments with @mention notifications.', taskKey: 'TFP-14', projectId: projects[0]._id, organizationId: org._id, assigneeId: users[2]._id, createdBy: users[0]._id, priority: 'p1', status: 'in_review', sprintId: activeSprint._id, labels: ['collaboration'], storyPoints: 5, dueDate: new Date(now.getTime() + 3 * 86400000) },
      { title: 'Notification system', description: 'In-app notifications with bell icon and unread count.', taskKey: 'TFP-15', projectId: projects[0]._id, organizationId: org._id, assigneeId: users[3]._id, createdBy: users[1]._id, priority: 'p1', status: 'todo', sprintId: activeSprint._id, labels: ['notifications'], storyPoints: 5, dueDate: new Date(now.getTime() + 10 * 86400000) },
      { title: 'Real-time SSE sync', description: 'Replace Socket.IO with Server-Sent Events.', taskKey: 'TFP-16', projectId: projects[0]._id, organizationId: org._id, assigneeId: users[0]._id, createdBy: users[0]._id, priority: 'p1', status: 'todo', sprintId: activeSprint._id, labels: ['realtime'], storyPoints: 5, dueDate: new Date(now.getTime() + 8 * 86400000) },
      // Backlog
      { title: 'Calendar view', description: 'Monthly calendar with tasks by due date.', taskKey: 'TFP-17', projectId: projects[0]._id, organizationId: org._id, assigneeId: null, createdBy: users[0]._id, priority: 'p2', status: 'backlog', labels: ['ui'], storyPoints: 8 },
      { title: 'Keyboard shortcuts', description: 'C create, Esc close, / search, ? help.', taskKey: 'TFP-18', projectId: projects[0]._id, organizationId: org._id, assigneeId: null, createdBy: users[0]._id, priority: 'p3', status: 'backlog', labels: ['polish'], storyPoints: 3 },
      { title: 'Email notifications', description: 'Daily digest via Nodemailer.', taskKey: 'TFP-19', projectId: projects[0]._id, organizationId: org._id, assigneeId: null, createdBy: users[1]._id, priority: 'p3', status: 'backlog', labels: ['notifications'], storyPoints: 5 },
      // Mobile App tasks
      { title: 'Design mobile UI', taskKey: 'MOB-1', projectId: projects[1]._id, organizationId: org._id, assigneeId: users[1]._id, createdBy: users[1]._id, priority: 'p1', status: 'in_progress', labels: ['mobile', 'ui'], storyPoints: 8, dueDate: new Date(now.getTime() + 10 * 86400000) },
      { title: 'Setup React Native', taskKey: 'MOB-2', projectId: projects[1]._id, organizationId: org._id, assigneeId: users[3]._id, createdBy: users[1]._id, priority: 'p1', status: 'todo', labels: ['mobile'], storyPoints: 5 },
      { title: 'Push notifications', taskKey: 'MOB-3', projectId: projects[1]._id, organizationId: org._id, assigneeId: null, createdBy: users[1]._id, priority: 'p2', status: 'backlog', labels: ['mobile'], storyPoints: 5 },
      { title: 'Offline sync', taskKey: 'MOB-4', projectId: projects[1]._id, organizationId: org._id, assigneeId: null, createdBy: users[1]._id, priority: 'p3', status: 'backlog', labels: ['mobile'], storyPoints: 13 }
    ]);
    console.log(`✓ Created ${tasks.length} tasks`);

    // ── Create Sprint Histories (for AI training) ──
    await SprintHistory.create([
      {
        orgId: org._id, sprintId: sprints[0]._id, projectId: projects[0]._id,
        plannedPoints: 34, completedPoints: 28,
        memberStats: [
          { userId: users[0]._id, pointsCompleted: 18, tasksCompleted: 3 },
          { userId: users[1]._id, pointsCompleted: 8, tasksCompleted: 1 },
          { userId: users[2]._id, pointsCompleted: 2, tasksCompleted: 0 }
        ],
        retrospectiveSummary: '**What went well:**\n• Foundation setup completed ahead of schedule.\n• Auth system was solid from the start.\n\n**What didn\'t go well:**\n• Some tasks were underestimated.\n\n**What to try next:**\n• Better estimation sessions before sprint start.',
        completedAt: new Date(now.getTime() - 28 * 86400000)
      },
      {
        orgId: org._id, sprintId: sprints[1]._id, projectId: projects[0]._id,
        plannedPoints: 35, completedPoints: 32,
        memberStats: [
          { userId: users[0]._id, pointsCompleted: 5, tasksCompleted: 1 },
          { userId: users[1]._id, pointsCompleted: 5, tasksCompleted: 1 },
          { userId: users[2]._id, pointsCompleted: 21, tasksCompleted: 2 }
        ],
        retrospectiveSummary: '**What went well:**\n• Kanban board was the highlight — great drag-and-drop experience.\n• API development was fast.\n\n**What didn\'t go well:**\n• Some tasks were blocked waiting for design.\n\n**What to try next:**\n• Start design work a sprint ahead.',
        completedAt: new Date(now.getTime() - 14 * 86400000)
      },
      {
        orgId: org._id, sprintId: sprints[2]._id, projectId: projects[0]._id,
        plannedPoints: 30, completedPoints: 25,
        memberStats: [
          { userId: users[0]._id, pointsCompleted: 5, tasksCompleted: 1 },
          { userId: users[1]._id, pointsCompleted: 8, tasksCompleted: 1 },
          { userId: users[2]._id, pointsCompleted: 8, tasksCompleted: 2 },
          { userId: users[3]._id, pointsCompleted: 4, tasksCompleted: 1 }
        ],
        retrospectiveSummary: '**What went well:**\n• Dashboard looks great with stats and insights.\n• Search and filter dramatically improved usability.\n\n**What didn\'t go well:**\n• Sprint ended with 5 points unfinished.\n\n**What to try next:**\n• Add buffer for UI polish tasks — they always take longer.',
        completedAt: new Date(now.getTime())
      }
    ]);
    console.log('✓ Created 3 sprint histories (AI training data)');

    // ── Create sample comments ──
    await Comment.create([
      { taskId: tasks[6]._id, orgId: org._id, authorId: users[0]._id, body: 'The drag-and-drop is working smoothly with dnd-kit. @Priya Sharma can you test on mobile?' , mentions: [users[1]._id] },
      { taskId: tasks[6]._id, orgId: org._id, authorId: users[1]._id, body: 'Tested on mobile — works well! The touch targets are a bit small though.' },
      { taskId: tasks[11]._id, orgId: org._id, authorId: users[0]._id, body: 'AI engine is using rule-based scoring for now. Will switch to trained models after we have enough sprint data.' },
      { taskId: tasks[12]._id, orgId: org._id, authorId: users[1]._id, body: '@Rahul Verma the burndown chart needs Recharts. Can you handle that?', mentions: [users[2]._id] }
    ]);
    console.log('✓ Created sample comments');

    // ── Initial AI Model entries ──
    await AIModel.create([
      { orgId: org._id, modelType: 'velocity', version: 1, parameters: { avgVelocity: 28.3, weightedAvg: 27.1, avgCompletionRate: 0.86, sprintCount: 3 }, trainingData: { sampleCount: 3, lastTrainedAt: now } },
      { orgId: org._id, modelType: 'risk', version: 1, parameters: { avgCompletionRate: 0.86 }, trainingData: { sampleCount: 3, lastTrainedAt: now } },
      { orgId: org._id, modelType: 'estimation', version: 0, parameters: {}, trainingData: { sampleCount: 0 } },
      { orgId: org._id, modelType: 'delay', version: 0, parameters: {}, trainingData: { sampleCount: 0 } },
      { orgId: org._id, modelType: 'productivity', version: 0, parameters: {}, trainingData: { sampleCount: 0 } }
    ]);
    console.log('✓ Created AI model entries (velocity & risk pre-trained from sprint history)');

    console.log('\n' + '='.repeat(50));
    console.log('✅ Seed completed successfully!');
    console.log('='.repeat(50));
    console.log('\n📋 Test credentials:');
    console.log('   Email: sandeep@taskflow.ai');
    console.log('   Password: password123');
    console.log(`\n🏢 Organization slug: ${org.slug}`);
    console.log('\n📊 AI Status:');
    console.log('   Velocity model:  TRAINED (3 sprints)');
    console.log('   Risk model:      TRAINED (3 sprints)');
    console.log('   Estimation:      Rule-based (need 50+ completed tasks)');
    console.log('   Delay:           Rule-based (need 20+ completed tasks)');
    console.log('   Productivity:    Demo mode (need 20+ completed tasks)\n');

    process.exit(0);
  } catch (error) {
    console.error('Seed error:', error);
    process.exit(1);
  }
}

seed();
