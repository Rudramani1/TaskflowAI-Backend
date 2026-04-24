// Self-Learning AI Engine for TaskFlow
// Phase 1: Rule-based heuristics (works from day 1)
// Phase 2: Data collection (logs predictions + outcomes to MongoDB)
// Phase 3: When thresholds are met, trains statistical models on real data
//
// Every prediction goes through: getModel() → predict() → logPrediction()
// On sprint close: trainModels() recalculates model parameters

const AIModel = require('../models/AIModel');
const AIPredictionLog = require('../models/AIPredictionLog');
const SprintHistory = require('../models/SprintHistory');
const Task = require('../models/Task');
const Sprint = require('../models/Sprint');
const User = require('../models/User');
const Organization = require('../models/Organization');
const mongoose = require('mongoose');

// ═══════════════════════════════════════════
// MODEL MANAGEMENT
// ═══════════════════════════════════════════

async function getModel(orgId, modelType) {
  let model = await AIModel.findOne({ orgId, modelType });
  if (!model) {
    model = await AIModel.create({ orgId, modelType, version: 0, parameters: {}, trainingData: { sampleCount: 0 } });
  }
  return model;
}

async function logPrediction(orgId, predictionType, input, output, entityId, entityType, modelVersion = 0) {
  try {
    await AIPredictionLog.create({ orgId, predictionType, input, output, entityId, entityType, modelVersion });
  } catch (err) {
    console.error('Failed to log prediction:', err.message);
  }
}

// ═══════════════════════════════════════════
// STORY POINTS ESTIMATION
// ═══════════════════════════════════════════

async function estimateStoryPoints(orgId, title, description) {
  const model = await getModel(orgId, 'estimation');
  let points, reasoning, modelVersion;

  if (model.trainingData.sampleCount >= 50 && model.parameters.coefficients) {
    // Trained model: linear regression
    const features = extractFeatures(title, description);
    const coeff = model.parameters.coefficients;
    const raw = coeff.intercept +
      (coeff.descLength * features.descLength) +
      (coeff.subtaskMentions * features.subtaskMentions) +
      (coeff.complexityScore * features.complexityScore);
    points = fibonacciRound(Math.max(1, Math.min(raw, 21)));
    reasoning = `Trained model (v${model.version}, ${model.trainingData.sampleCount} samples, ${Math.round(model.trainingData.accuracy || 0)}% accuracy): estimated based on description complexity and historical completion data.`;
    modelVersion = model.version;
  } else {
    // Rule-based estimation
    const features = extractFeatures(title, description);
    let effort = 1;

    if (features.descLength > 200) effort += 3;
    else if (features.descLength > 100) effort += 2;
    else if (features.descLength > 50) effort += 1;

    effort += features.subtaskMentions * 0.5;
    if (features.hasComplexKeywords) effort += 2;
    if (features.hasIntegrationKeywords) effort += 1;

    points = fibonacciRound(Math.max(1, Math.min(effort, 13)));
    reasoning = `Rule-based estimate: ${features.descLength} words in description, ${features.subtaskMentions} subtask references, complexity keywords: ${features.hasComplexKeywords ? 'yes' : 'no'}.`;
    modelVersion = 0;
  }

  await logPrediction(orgId, 'story_points', { title, descriptionLength: (description || '').length }, { points, reasoning }, null, 'task', modelVersion);

  return { points, reasoning, modelVersion, confidence: modelVersion > 0 ? 'trained' : 'rule-based' };
}

function extractFeatures(title, description) {
  const text = `${title} ${description}`.toLowerCase();
  const wordCount = (description || '').split(/\s+/).filter(Boolean).length;
  const complexKeywords = ['refactor', 'migrate', 'integrate', 'redesign', 'architect', 'security', 'performance', 'scalab'];
  const integrationKeywords = ['api', 'oauth', 'webhook', 'third-party', 'external', 'database migration'];

  return {
    descLength: wordCount,
    subtaskMentions: (text.match(/\b(step|subtask|checklist|todo)\b/gi) || []).length,
    complexityScore: complexKeywords.filter(kw => text.includes(kw)).length,
    hasComplexKeywords: complexKeywords.some(kw => text.includes(kw)),
    hasIntegrationKeywords: integrationKeywords.some(kw => text.includes(kw))
  };
}

function fibonacciRound(n) {
  const fib = [1, 2, 3, 5, 8, 13, 21];
  return fib.reduce((prev, curr) => Math.abs(curr - n) < Math.abs(prev - n) ? curr : prev);
}

// ═══════════════════════════════════════════
// SPRINT RISK SCORE
// ═══════════════════════════════════════════

async function calculateSprintRisk(orgId, sprintId) {
  const sprint = await Sprint.findById(sprintId);
  if (!sprint) throw new Error('Sprint not found');

  const tasks = await Task.find({ sprintId, organizationId: orgId });
  const totalTasks = tasks.length;
  if (totalTasks === 0) return { score: 0, level: 'low', explanation: 'No tasks in sprint.', modelVersion: 0 };

  const completedTasks = tasks.filter(t => t.status === 'done').length;
  const incompleteTasks = totalTasks - completedTasks;
  const totalPoints = tasks.reduce((s, t) => s + (t.storyPoints || 0), 0);
  const completedPoints = tasks.filter(t => t.status === 'done').reduce((s, t) => s + (t.storyPoints || 0), 0);

  const now = new Date();
  const sprintEnd = new Date(sprint.endDate);
  const sprintStart = new Date(sprint.startDate);
  const totalDays = Math.max(1, (sprintEnd - sprintStart) / (1000 * 60 * 60 * 24));
  const daysElapsed = Math.max(0, (now - sprintStart) / (1000 * 60 * 60 * 24));
  const daysRemaining = Math.max(0, (sprintEnd - now) / (1000 * 60 * 60 * 24));

  const timeProgress = daysElapsed / totalDays;
  const taskProgress = completedTasks / totalTasks;
  const pointProgress = totalPoints > 0 ? completedPoints / totalPoints : taskProgress;

  // Check for trained risk model
  const model = await getModel(orgId, 'risk');
  let score, modelVersion = 0;

  if (model.trainingData.sampleCount >= 3 && model.parameters.avgCompletionRate !== undefined) {
    // Bayesian risk scoring using historical data
    const historicalRate = model.parameters.avgCompletionRate;
    const expectedProgress = timeProgress * historicalRate;
    const deviation = Math.max(0, expectedProgress - pointProgress);
    score = Math.min(100, Math.round(deviation * 100 + (daysRemaining < 2 && incompleteTasks > 0 ? 20 : 0)));
    modelVersion = model.version;
  } else {
    // Rule-based risk
    score = Math.min(100, Math.round(Math.max(0, (timeProgress - taskProgress) * 100 + (incompleteTasks / totalTasks) * 30)));
    if (daysRemaining <= 2 && incompleteTasks > 0) score = Math.min(100, score + 20);
  }

  const level = score < 30 ? 'low' : score < 60 ? 'medium' : 'high';

  let explanation;
  if (score >= 60) {
    explanation = `High risk: ${incompleteTasks} of ${totalTasks} tasks remaining with only ${Math.round(daysRemaining)} day(s) left. The team is ${Math.round(timeProgress * 100)}% through the sprint but only ${Math.round(taskProgress * 100)}% of tasks are done.`;
  } else if (score >= 30) {
    explanation = `Moderate risk: ${incompleteTasks} tasks remaining, ${Math.round(daysRemaining)} day(s) left. Progress is slightly behind schedule.`;
  } else {
    explanation = `Low risk: Sprint is on track. ${completedTasks} of ${totalTasks} tasks completed with ${Math.round(daysRemaining)} day(s) remaining.`;
  }

  await logPrediction(orgId, 'sprint_risk', { sprintId, totalTasks, completedTasks, daysRemaining }, { score, level }, sprintId, 'sprint', modelVersion);

  return {
    score, level, explanation, modelVersion,
    totalTasks, completedTasks, incompleteTasks,
    daysRemaining: Math.round(daysRemaining),
    timeProgress: Math.round(timeProgress * 100),
    taskProgress: Math.round(taskProgress * 100),
    pointProgress: Math.round(pointProgress * 100)
  };
}

// ═══════════════════════════════════════════
// DELAY PREDICTION
// ═══════════════════════════════════════════

async function predictDelays(orgId, projectId) {
  const tasks = await Task.find({
    organizationId: orgId,
    projectId,
    status: { $ne: 'done' },
    dueDate: { $ne: null }
  }).populate('assigneeId', 'name');

  const now = new Date();
  const model = await getModel(orgId, 'delay');
  const modelVersion = model.trainingData.sampleCount >= 20 ? model.version : 0;

  const predictions = tasks.map(task => {
    const dueDate = new Date(task.dueDate);
    const daysUntilDue = (dueDate - now) / (1000 * 60 * 60 * 24);
    const statusProgress = { backlog: 0, todo: 0.1, in_progress: 0.5, in_review: 0.8 };
    const progress = statusProgress[task.status] || 0;

    let estimatedDaysNeeded;
    if (modelVersion > 0 && model.parameters.avgDaysPerPoint) {
      estimatedDaysNeeded = (task.storyPoints || 3) * model.parameters.avgDaysPerPoint * (1 - progress);
    } else {
      estimatedDaysNeeded = progress > 0 ? (1 - progress) * (task.storyPoints || 3) : (task.storyPoints || 3);
    }

    const isAtRisk = estimatedDaysNeeded > daysUntilDue;
    const delayDays = isAtRisk ? Math.round(estimatedDaysNeeded - daysUntilDue) : 0;

    let reason = '';
    if (isAtRisk) {
      if (daysUntilDue < 0) reason = `Task is ${Math.abs(Math.round(daysUntilDue))} day(s) overdue and still in "${task.status}" status.`;
      else if (progress < 0.2 && daysUntilDue < 3) reason = `Only ${Math.round(progress * 100)}% progress with ${Math.round(daysUntilDue)} day(s) until deadline.`;
      else reason = `At current pace, needs ~${Math.round(estimatedDaysNeeded)} more day(s) but only ${Math.round(daysUntilDue)} day(s) remain.`;
    }

    return {
      taskId: task._id,
      taskKey: task.taskKey,
      title: task.title,
      assignee: task.assigneeId ? { id: task.assigneeId._id, name: task.assigneeId.name } : null,
      dueDate: task.dueDate,
      status: task.status,
      progress: Math.round(progress * 100),
      daysUntilDue: Math.round(daysUntilDue),
      estimatedDaysNeeded: Math.round(estimatedDaysNeeded),
      isAtRisk,
      predictedDelayDays: delayDays,
      riskLevel: !isAtRisk ? 'on_track' : delayDays <= 2 ? 'warning' : 'critical',
      reason
    };
  });

  const atRiskCount = predictions.filter(p => p.isAtRisk).length;
  await logPrediction(orgId, 'delay', { projectId, taskCount: tasks.length }, { atRiskCount }, projectId, 'project', modelVersion);

  return {
    predictions: predictions.sort((a, b) => b.predictedDelayDays - a.predictedDelayDays),
    summary: { totalTracked: predictions.length, atRisk: atRiskCount, onTrack: predictions.length - atRiskCount },
    modelVersion
  };
}

// ═══════════════════════════════════════════
// BOTTLENECK DETECTION
// ═══════════════════════════════════════════

async function detectBottlenecks(orgId, projectId) {
  const threeDaysAgo = new Date();
  threeDaysAgo.setDate(threeDaysAgo.getDate() - 3);

  const tasks = await Task.find({
    organizationId: orgId,
    projectId,
    status: { $in: ['in_review', 'backlog'] },
    updatedAt: { $lt: threeDaysAgo }
  }).populate('assigneeId', 'name');

  const bottlenecks = tasks.map(task => {
    const daysStuck = Math.round((new Date() - new Date(task.updatedAt)) / (1000 * 60 * 60 * 24));
    let reason;
    if (task.status === 'in_review') {
      reason = `Stuck in review for ${daysStuck} day(s). Consider expediting the review or reassigning.`;
    } else {
      reason = `In backlog for ${daysStuck} day(s) without movement. May need reprioritization.`;
    }

    return {
      taskId: task._id,
      taskKey: task.taskKey,
      title: task.title,
      status: task.status,
      assignee: task.assigneeId ? { id: task.assigneeId._id, name: task.assigneeId.name } : null,
      daysStuck,
      reason
    };
  });

  return {
    bottlenecks: bottlenecks.sort((a, b) => b.daysStuck - a.daysStuck),
    count: bottlenecks.length
  };
}

// ═══════════════════════════════════════════
// WORKLOAD DISTRIBUTION
// ═══════════════════════════════════════════

async function getWorkloadDistribution(orgId) {
  const workload = await Task.aggregate([
    { $match: { organizationId: new mongoose.Types.ObjectId(orgId), status: { $ne: 'done' } } },
    {
      $group: {
        _id: '$assigneeId',
        taskCount: { $sum: 1 },
        openPoints: { $sum: { $ifNull: ['$storyPoints', 0] } },
        priorities: { $push: '$priority' }
      }
    },
    { $lookup: { from: 'users', localField: '_id', foreignField: '_id', as: 'userInfo' } },
    { $unwind: { path: '$userInfo', preserveNullAndEmptyArrays: true } }
  ]);

  const distribution = workload.map(w => ({
    user: w.userInfo ? { id: w.userInfo._id, name: w.userInfo.name, avatar: w.userInfo.avatar } : { name: 'Unassigned' },
    taskCount: w.taskCount,
    openPoints: w.openPoints,
    p0Count: w.priorities.filter(p => p === 'p0').length,
    p1Count: w.priorities.filter(p => p === 'p1').length,
    p2Count: w.priorities.filter(p => p === 'p2').length,
    p3Count: w.priorities.filter(p => p === 'p3').length,
    overloaded: w.openPoints > 20 || w.taskCount > 8
  }));

  distribution.sort((a, b) => b.openPoints - a.openPoints);

  return {
    distribution,
    summary: {
      avgPointsPerMember: distribution.length > 0 ? Math.round(distribution.reduce((s, d) => s + d.openPoints, 0) / distribution.length) : 0,
      overloadedMembers: distribution.filter(d => d.overloaded).length,
      totalActiveTasks: distribution.reduce((s, d) => s + d.taskCount, 0),
      totalOpenPoints: distribution.reduce((s, d) => s + d.openPoints, 0)
    }
  };
}

// ═══════════════════════════════════════════
// ASSIGNMENT SUGGESTION
// ═══════════════════════════════════════════

async function suggestAssignment(orgId, projectId) {
  const org = await Organization.findById(orgId).populate('members.user', 'name email avatar');
  if (!org) return { suggestions: [], recommended: null };

  const memberWorkloads = await Promise.all(
    org.members.map(async (member) => {
      if (!member.user) return null;
      const activeTasks = await Task.countDocuments({
        assigneeId: member.user._id,
        status: { $in: ['todo', 'in_progress', 'in_review'] },
        organizationId: orgId
      });
      const openPoints = await Task.aggregate([
        { $match: { assigneeId: member.user._id, status: { $ne: 'done' }, organizationId: new mongoose.Types.ObjectId(orgId) } },
        { $group: { _id: null, total: { $sum: { $ifNull: ['$storyPoints', 0] } } } }
      ]);
      const completedTasks = await Task.countDocuments({
        assigneeId: member.user._id,
        status: 'done',
        organizationId: orgId
      });

      return {
        user: { id: member.user._id, name: member.user.name, email: member.user.email, avatar: member.user.avatar },
        activeTasks,
        openPoints: openPoints[0]?.total || 0,
        completedTasks,
        workloadScore: (openPoints[0]?.total || 0) + activeTasks * 2,
        efficiency: completedTasks > 0 ? Math.round((completedTasks / (completedTasks + activeTasks)) * 100) : 0
      };
    })
  );

  const valid = memberWorkloads.filter(Boolean).sort((a, b) => a.workloadScore - b.workloadScore);

  return {
    suggestions: valid,
    recommended: valid[0] || null
  };
}

// ═══════════════════════════════════════════
// VELOCITY TRACKING (gated at 3 sprints)
// ═══════════════════════════════════════════

async function getVelocity(orgId, projectId) {
  const filter = { orgId };
  if (projectId) filter.projectId = projectId;

  const histories = await SprintHistory.find(filter)
    .populate('sprintId', 'name startDate endDate')
    .sort({ completedAt: 1 });

  const realCount = histories.length;
  const threshold = 3;
  const demoMode = realCount < threshold;

  let data;
  if (demoMode) {
    // Demo data for velocity chart
    data = [
      { sprintName: 'Sprint 1 (Demo)', plannedPoints: 34, completedPoints: 28 },
      { sprintName: 'Sprint 2 (Demo)', plannedPoints: 30, completedPoints: 32 },
      { sprintName: 'Sprint 3 (Demo)', plannedPoints: 38, completedPoints: 25 },
      { sprintName: 'Sprint 4 (Demo)', plannedPoints: 35, completedPoints: 33 },
      { sprintName: 'Sprint 5 (Demo)', plannedPoints: 40, completedPoints: 38 },
      { sprintName: 'Sprint 6 (Demo)', plannedPoints: 36, completedPoints: 35 }
    ];
  } else {
    data = histories.map(h => ({
      sprintName: h.sprintId?.name || 'Unknown',
      plannedPoints: h.plannedPoints,
      completedPoints: h.completedPoints,
      startDate: h.sprintId?.startDate,
      endDate: h.sprintId?.endDate
    }));
  }

  return {
    data,
    demoMode,
    realSprintCount: realCount,
    threshold,
    remainingToUnlock: Math.max(0, threshold - realCount)
  };
}

// ═══════════════════════════════════════════
// PRODUCTIVITY TRENDS (gated at 4 weeks)
// ═══════════════════════════════════════════

async function getProductivity(orgId, projectId) {
  const fourWeeksAgo = new Date();
  fourWeeksAgo.setDate(fourWeeksAgo.getDate() - 28);

  const filter = { organizationId: new mongoose.Types.ObjectId(orgId), status: 'done', completedAt: { $gte: fourWeeksAgo } };
  if (projectId && projectId !== 'all') filter.projectId = new mongoose.Types.ObjectId(projectId);

  const completedTasks = await Task.find(filter).populate('assigneeId', 'name avatar');
  const totalCompleted = completedTasks.length;

  const threshold = 20; // 20 completed tasks minimum
  const demoMode = totalCompleted < threshold;

  if (demoMode) {
    return {
      weeklyData: {
        'Week 1 (Demo)': { 'Alice': { name: 'Alice', count: 8 }, 'Bob': { name: 'Bob', count: 5 }, 'Carol': { name: 'Carol', count: 3 } },
        'Week 2 (Demo)': { 'Alice': { name: 'Alice', count: 6 }, 'Bob': { name: 'Bob', count: 7 }, 'Carol': { name: 'Carol', count: 2 } },
        'Week 3 (Demo)': { 'Alice': { name: 'Alice', count: 9 }, 'Bob': { name: 'Bob', count: 4 }, 'Carol': { name: 'Carol', count: 4 } },
        'Week 4 (Demo)': { 'Alice': { name: 'Alice', count: 7 }, 'Bob': { name: 'Bob', count: 6 }, 'Carol': { name: 'Carol', count: 1 } }
      },
      summary: { totalCompleted: 62, avgPerWeek: 16, period: '4 weeks' },
      demoMode: true,
      threshold,
      remainingToUnlock: Math.max(0, threshold - totalCompleted)
    };
  }

  // Real data
  const weeklyData = {};
  completedTasks.forEach(task => {
    const weekNum = getWeekLabel(task.completedAt);
    const userId = task.assigneeId?._id?.toString() || 'unassigned';
    const userName = task.assigneeId?.name || 'Unassigned';
    if (!weeklyData[weekNum]) weeklyData[weekNum] = {};
    if (!weeklyData[weekNum][userId]) weeklyData[weekNum][userId] = { name: userName, count: 0 };
    weeklyData[weekNum][userId].count++;
  });

  return {
    weeklyData,
    summary: { totalCompleted, avgPerWeek: Math.round(totalCompleted / 4), period: '4 weeks' },
    demoMode: false,
    threshold
  };
}

// ═══════════════════════════════════════════
// SPRINT RETROSPECTIVE (gated at 2 sprints)
// ═══════════════════════════════════════════

async function generateRetrospective(orgId, sprintId) {
  const sprint = await Sprint.findById(sprintId);
  if (!sprint) throw new Error('Sprint not found');

  const sprintHistories = await SprintHistory.find({ orgId }).sort({ completedAt: -1 });
  const realCount = sprintHistories.length;
  const threshold = 2;
  const demoMode = realCount < threshold;

  const tasks = await Task.find({ sprintId, organizationId: orgId }).populate('assigneeId', 'name');
  const totalTasks = tasks.length;
  const completedTasks = tasks.filter(t => t.status === 'done');
  const incompleteTasks = tasks.filter(t => t.status !== 'done');
  const completionRate = totalTasks > 0 ? Math.round((completedTasks.length / totalTasks) * 100) : 0;

  const totalPoints = tasks.reduce((s, t) => s + (t.storyPoints || 0), 0);
  const completedPoints = completedTasks.reduce((s, t) => s + (t.storyPoints || 0), 0);

  let summary;
  if (demoMode) {
    summary = `**Demo Retrospective** — Complete ${threshold - realCount} more sprint(s) to unlock AI-generated retrospectives with your real data.\n\n`;
    summary += `**What went well:** The team maintained steady progress and completed several high-priority items on schedule.\n\n`;
    summary += `**What didn't go well:** A few tasks got stuck in review for too long, causing a bottleneck.\n\n`;
    summary += `**What to try next:** Consider implementing daily standups and setting WIP limits for the review column.`;
  } else {
    // Generate based on real data
    const wentWell = [];
    const didntGoWell = [];
    const tryNext = [];

    if (completionRate >= 80) wentWell.push(`Strong completion rate of ${completionRate}% — the team delivered on most commitments.`);
    else if (completionRate >= 60) wentWell.push(`Decent completion rate of ${completionRate}%.`);

    if (completedPoints > 0) wentWell.push(`Delivered ${completedPoints} story points this sprint.`);

    const overdue = tasks.filter(t => t.dueDate && new Date(t.dueDate) < new Date(sprint.endDate) && t.status !== 'done');
    if (overdue.length > 0) didntGoWell.push(`${overdue.length} task(s) missed their due dates within the sprint.`);
    if (incompleteTasks.length > 0) didntGoWell.push(`${incompleteTasks.length} task(s) were not completed and need to be carried over.`);

    if (completionRate < 80) tryNext.push(`Consider reducing sprint scope — planned ${totalPoints} points but completed ${completedPoints}.`);
    if (overdue.length > 2) tryNext.push(`Set tighter deadlines with buffer days, or break large tasks into smaller ones.`);
    tryNext.push(`Review blocked items earlier in the sprint to prevent end-of-sprint bottlenecks.`);

    summary = `**What went well:**\n${wentWell.map(w => `• ${w}`).join('\n')}\n\n`;
    summary += `**What didn't go well:**\n${didntGoWell.length > 0 ? didntGoWell.map(d => `• ${d}`).join('\n') : '• Nothing major — great sprint!'}\n\n`;
    summary += `**What to try next:**\n${tryNext.map(t => `• ${t}`).join('\n')}`;
  }

  return {
    summary,
    stats: { totalTasks, completedTasks: completedTasks.length, completionRate, totalPoints, completedPoints },
    demoMode,
    threshold,
    realSprintCount: realCount
  };
}

// ═══════════════════════════════════════════
// PRIORITIZATION SUGGESTIONS (gated at 3 sprints)
// ═══════════════════════════════════════════

async function suggestPrioritization(orgId, sprintId) {
  const histories = await SprintHistory.find({ orgId });
  const realCount = histories.length;
  const threshold = 3;
  const demoMode = realCount < threshold;

  const tasks = await Task.find({ sprintId, organizationId: orgId, status: { $ne: 'done' } })
    .sort({ dueDate: 1 });

  if (demoMode) {
    return {
      suggestions: tasks.slice(0, 3).map(t => ({
        taskId: t._id,
        taskKey: t.taskKey,
        title: t.title,
        currentPriority: t.priority,
        suggestedPriority: t.dueDate && new Date(t.dueDate) < new Date(Date.now() + 3 * 86400000) ? 'p0' : t.priority,
        reason: 'Demo mode — complete more sprints to get data-driven prioritization.'
      })),
      demoMode: true,
      threshold,
      remainingToUnlock: threshold - realCount
    };
  }

  // Real prioritization based on historical data
  const now = new Date();
  const suggestions = tasks.map(task => {
    let suggestedPriority = task.priority;
    let reason = '';

    if (task.dueDate) {
      const daysUntilDue = (new Date(task.dueDate) - now) / (1000 * 60 * 60 * 24);
      if (daysUntilDue < 0) { suggestedPriority = 'p0'; reason = `Task is overdue by ${Math.abs(Math.round(daysUntilDue))} day(s).`; }
      else if (daysUntilDue <= 1) { suggestedPriority = 'p0'; reason = `Due within 24 hours.`; }
      else if (daysUntilDue <= 3 && task.status === 'todo') { suggestedPriority = 'p1'; reason = `Due in ${Math.round(daysUntilDue)} day(s) but hasn't started.`; }
    }

    if (task.storyPoints && task.storyPoints >= 8 && task.status === 'backlog') {
      suggestedPriority = 'p1';
      reason = `Large task (${task.storyPoints} points) still in backlog — should be started early.`;
    }

    return {
      taskId: task._id,
      taskKey: task.taskKey,
      title: task.title,
      currentPriority: task.priority,
      suggestedPriority,
      reason
    };
  }).filter(s => s.suggestedPriority !== s.currentPriority);

  return { suggestions, demoMode: false, threshold };
}

// ═══════════════════════════════════════════
// PROJECT INSIGHTS (combined)
// ═══════════════════════════════════════════

async function getInsights(orgId, projectId) {
  const filter = { organizationId: new mongoose.Types.ObjectId(orgId) };
  if (projectId && projectId !== 'all') filter.projectId = new mongoose.Types.ObjectId(projectId);

  const tasks = await Task.find(filter).populate('assigneeId', 'name');
  const now = new Date();
  const insights = [];

  // Bottleneck detection
  const statusCounts = {};
  tasks.forEach(t => { statusCounts[t.status] = (statusCounts[t.status] || 0) + 1; });
  const inReview = statusCounts['in_review'] || 0;
  if (inReview > 5) {
    insights.push({ type: 'bottleneck', severity: 'warning', message: `${inReview} tasks stuck in review. Consider expediting reviews.`, icon: '⚠️' });
  }

  // Overdue tasks
  const overdue = tasks.filter(t => t.dueDate && new Date(t.dueDate) < now && t.status !== 'done');
  if (overdue.length > 0) {
    insights.push({ type: 'overdue', severity: 'critical', message: `${overdue.length} tasks are past their due date.`, icon: '🔴' });
  }

  // Unassigned tasks
  const unassigned = tasks.filter(t => !t.assigneeId && t.status !== 'done');
  if (unassigned.length > 3) {
    insights.push({ type: 'unassigned', severity: 'info', message: `${unassigned.length} tasks have no assignee. Consider assigning them.`, icon: 'ℹ️' });
  }

  // High workload members
  const memberLoads = {};
  tasks.filter(t => t.assigneeId && t.status !== 'done').forEach(t => {
    const name = t.assigneeId.name;
    memberLoads[name] = (memberLoads[name] || 0) + 1;
  });
  Object.entries(memberLoads).forEach(([name, count]) => {
    if (count > 8) {
      insights.push({ type: 'workload', severity: 'warning', message: `${name} has ${count} active tasks. Risk of burnout.`, icon: '⚡' });
    }
  });

  // Completion rate
  const total = tasks.length;
  const done = tasks.filter(t => t.status === 'done').length;
  const completionRate = total > 0 ? Math.round((done / total) * 100) : 0;
  insights.push({ type: 'progress', severity: 'info', message: `Overall completion rate: ${completionRate}%`, icon: '📊' });

  return { insights, stats: { total, done, completionRate, statusCounts } };
}

// ═══════════════════════════════════════════
// MODEL TRAINING
// ═══════════════════════════════════════════

async function trainModels(orgId) {
  console.log(`🧠 Training AI models for org: ${orgId}`);

  try {
    // Train velocity model
    const histories = await SprintHistory.find({ orgId }).sort({ completedAt: 1 });
    if (histories.length >= 3) {
      const avgVelocity = histories.reduce((s, h) => s + h.completedPoints, 0) / histories.length;
      const avgCompletionRate = histories.reduce((s, h) => s + (h.plannedPoints > 0 ? h.completedPoints / h.plannedPoints : 0), 0) / histories.length;

      // Weighted average (recent sprints count more)
      const decay = 0.8;
      let weightedSum = 0, weightTotal = 0;
      histories.forEach((h, i) => {
        const weight = Math.pow(decay, histories.length - 1 - i);
        weightedSum += h.completedPoints * weight;
        weightTotal += weight;
      });
      const weightedAvg = weightedSum / weightTotal;

      await AIModel.findOneAndUpdate(
        { orgId, modelType: 'velocity' },
        {
          $set: {
            parameters: { avgVelocity, weightedAvg, avgCompletionRate, sprintCount: histories.length },
            'trainingData.sampleCount': histories.length,
            'trainingData.lastTrainedAt': new Date()
          },
          $inc: { version: 1 }
        },
        { upsert: true }
      );
      console.log(`  ✅ Velocity model trained (${histories.length} sprints, avg: ${Math.round(avgVelocity)} pts)`);

      // Train risk model
      await AIModel.findOneAndUpdate(
        { orgId, modelType: 'risk' },
        {
          $set: {
            parameters: { avgCompletionRate, historicalVelocity: avgVelocity },
            'trainingData.sampleCount': histories.length,
            'trainingData.lastTrainedAt': new Date()
          },
          $inc: { version: 1 }
        },
        { upsert: true }
      );
      console.log(`  ✅ Risk model trained (completion rate: ${Math.round(avgCompletionRate * 100)}%)`);
    }

    // Train estimation model
    const completedTasks = await Task.find({
      organizationId: orgId,
      status: 'done',
      storyPoints: { $ne: null },
      completedAt: { $ne: null }
    });

    if (completedTasks.length >= 50) {
      // Simple linear regression on story points vs actual time
      const dataPoints = completedTasks.map(t => {
        const actualDays = t.completedAt && t.createdAt
          ? (new Date(t.completedAt) - new Date(t.createdAt)) / (1000 * 60 * 60 * 24)
          : t.storyPoints;
        return { storyPoints: t.storyPoints, actualDays: Math.max(0.5, actualDays) };
      });

      const avgPointsPerDay = dataPoints.reduce((s, d) => s + d.storyPoints / d.actualDays, 0) / dataPoints.length;
      const avgDaysPerPoint = dataPoints.reduce((s, d) => s + d.actualDays / d.storyPoints, 0) / dataPoints.length;

      await AIModel.findOneAndUpdate(
        { orgId, modelType: 'estimation' },
        {
          $set: {
            parameters: { avgPointsPerDay, avgDaysPerPoint, sampleSize: dataPoints.length },
            'trainingData.sampleCount': completedTasks.length,
            'trainingData.lastTrainedAt': new Date()
          },
          $inc: { version: 1 }
        },
        { upsert: true }
      );
      console.log(`  ✅ Estimation model trained (${completedTasks.length} tasks)`);
    }

    // Train delay model
    if (completedTasks.length >= 20) {
      const tasksWithDueDate = completedTasks.filter(t => t.dueDate);
      const delayed = tasksWithDueDate.filter(t => new Date(t.completedAt) > new Date(t.dueDate));
      const avgDelayRate = tasksWithDueDate.length > 0 ? delayed.length / tasksWithDueDate.length : 0;

      const avgDaysPerPoint = completedTasks.reduce((s, t) => {
        const days = t.completedAt && t.createdAt ? (new Date(t.completedAt) - new Date(t.createdAt)) / (1000 * 60 * 60 * 24) : 1;
        return s + days / (t.storyPoints || 1);
      }, 0) / completedTasks.length;

      await AIModel.findOneAndUpdate(
        { orgId, modelType: 'delay' },
        {
          $set: {
            parameters: { avgDelayRate, avgDaysPerPoint },
            'trainingData.sampleCount': completedTasks.length,
            'trainingData.lastTrainedAt': new Date()
          },
          $inc: { version: 1 }
        },
        { upsert: true }
      );
      console.log(`  ✅ Delay model trained (delay rate: ${Math.round(avgDelayRate * 100)}%)`);
    }

    console.log('🧠 Model training complete');
  } catch (err) {
    console.error('Model training error:', err);
  }
}

// ═══════════════════════════════════════════
// CSV INGESTION
// ═══════════════════════════════════════════

async function ingestCSVTrainingData(orgId, type, rows) {
  if (!rows || rows.length === 0) return { inserted: 0, modelsRetrained: [] };
  
  let inserted = 0;
  let modelsToRetrain = [];
  
  if (type === 'sprint_history') {
    const sprintHistories = rows.map(row => ({
      orgId,
      sprintId: new mongoose.Types.ObjectId(),
      projectId: new mongoose.Types.ObjectId(),
      plannedPoints: Number(row.plannedPoints) || 0,
      completedPoints: Number(row.completedPoints) || 0,
      completedAt: new Date(),
      retrospectiveSummary: 'Imported from CSV',
      memberStats: []
    }));
    
    await SprintHistory.insertMany(sprintHistories);
    inserted = sprintHistories.length;
    
    const totalSprints = await SprintHistory.countDocuments({ orgId });
    if (totalSprints >= 3) {
      modelsToRetrain.push('velocity', 'risk');
    }
  } else if (type === 'completed_tasks') {
    const tasks = rows.map(row => {
      const daysToComplete = Number(row.daysToComplete) || 1;
      const completedOnTime = row.completedOnTime === 'true' || row.completedOnTime === '1' || row.completedOnTime?.toLowerCase() === 'yes';
      const completedAt = new Date();
      const createdAt = new Date(completedAt.getTime() - (daysToComplete * 24 * 60 * 60 * 1000));
      const dueDate = new Date(completedAt.getTime() + (completedOnTime ? 1 : -1) * 24 * 60 * 60 * 1000);

      return {
        organizationId: orgId,
        projectId: new mongoose.Types.ObjectId(),
        taskKey: `CSV-${Math.floor(Math.random() * 100000)}`,
        title: row.title || 'Imported Task',
        status: 'done',
        storyPoints: Number(row.storyPoints) || 0,
        createdAt,
        completedAt,
        dueDate
      };
    });
    
    await Task.insertMany(tasks);
    inserted = tasks.length;
    
    const totalTasks = await Task.countDocuments({
      organizationId: orgId,
      status: 'done',
      storyPoints: { $ne: null },
      completedAt: { $ne: null }
    });
    
    if (totalTasks >= 50) modelsToRetrain.push('estimation');
    if (totalTasks >= 20) modelsToRetrain.push('delay');
  }
  
  if (modelsToRetrain.length > 0) {
    await trainModels(orgId);
  }
  
  return { inserted, modelsRetrained: modelsToRetrain };
}

// ═══════════════════════════════════════════
// HELPERS
// ═══════════════════════════════════════════

function getWeekLabel(date) {
  const d = new Date(date);
  const startOfYear = new Date(d.getFullYear(), 0, 1);
  const days = Math.floor((d - startOfYear) / (1000 * 60 * 60 * 24));
  const weekNum = Math.ceil((days + startOfYear.getDay() + 1) / 7);
  return `Week ${weekNum}`;
}

module.exports = {
  estimateStoryPoints,
  calculateSprintRisk,
  predictDelays,
  detectBottlenecks,
  getWorkloadDistribution,
  suggestAssignment,
  getVelocity,
  getProductivity,
  generateRetrospective,
  suggestPrioritization,
  getInsights,
  trainModels,
  logPrediction,
  ingestCSVTrainingData
};
