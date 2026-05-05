const aiEngine = require('../services/ai-engine');
const csvParse = require('csv-parse');
const SprintHistory = require('../models/SprintHistory');
const Task = require('../models/Task');
const mlClient = require('../services/ml-client');

// @route POST /api/ai/estimate-points
exports.estimatePoints = async (req, res, next) => {
  try {
    const { title, description } = req.body;

    // Try ML service first
    const mlResult = await mlClient.predict('effort', {
      orgId: req.user.organizationId?.toString(),
      title: title || '',
      description: description || '',
    });
    if (mlResult && !mlResult.fallback) {
      return res.json({ ...mlResult, source: 'ml' });
    }

    // Fallback to rule-based engine
    const result = await aiEngine.estimateStoryPoints(req.user.organizationId, title, description);
    res.json({ ...result, source: 'rule-based' });
  } catch (error) { next(error); }
};

// @route GET /api/ai/sprint-risk/:sprintId
exports.getSprintRisk = async (req, res, next) => {
  try {
    const result = await aiEngine.calculateSprintRisk(req.user.organizationId, req.params.sprintId);
    res.json(result);
  } catch (error) { next(error); }
};

// @route GET /api/ai/delays/:projectId
exports.getDelays = async (req, res, next) => {
  try {
    // Try ML service first for enhanced delay predictions
    const mlResult = await mlClient.predict('delay', {
      orgId: req.user.organizationId?.toString(),
      taskId: req.params.projectId,
    });
    // ML delay is per-task; always include rule-based bulk analysis
    const result = await aiEngine.predictDelays(req.user.organizationId, req.params.projectId);
    if (mlResult && !mlResult.fallback) {
      result.mlEnhanced = true;
      result.mlModel = mlResult;
    }
    res.json(result);
  } catch (error) { next(error); }
};

// @route GET /api/ai/workload
exports.getWorkload = async (req, res, next) => {
  try {
    const result = await aiEngine.getWorkloadDistribution(req.user.organizationId);
    res.json(result);
  } catch (error) { next(error); }
};

// @route GET /api/ai/bottlenecks/:projectId
exports.getBottlenecks = async (req, res, next) => {
  try {
    const result = await aiEngine.detectBottlenecks(req.user.organizationId, req.params.projectId);
    res.json(result);
  } catch (error) { next(error); }
};

// @route GET /api/ai/suggest-assignee/:projectId
exports.suggestAssignee = async (req, res, next) => {
  try {
    // Try ML service first
    const mlResult = await mlClient.predict('assignee', {
      orgId: req.user.organizationId?.toString(),
      title: req.query.title || '',
      description: req.query.description || '',
      labels: req.query.labels ? req.query.labels.split(',') : [],
    });
    if (mlResult && !mlResult.fallback) {
      return res.json({ ...mlResult, source: 'ml' });
    }

    // Fallback to rule-based engine
    const result = await aiEngine.suggestAssignment(req.user.organizationId, req.params.projectId);
    res.json({ ...result, source: 'rule-based' });
  } catch (error) { next(error); }
};

// @route GET /api/ai/velocity/:projectId
exports.getVelocity = async (req, res, next) => {
  try {
    const result = await aiEngine.getVelocity(req.user.organizationId, req.params.projectId);
    res.json(result);
  } catch (error) { next(error); }
};

// @route GET /api/ai/productivity/:projectId
exports.getProductivity = async (req, res, next) => {
  try {
    const result = await aiEngine.getProductivity(req.user.organizationId, req.params.projectId);
    res.json(result);
  } catch (error) { next(error); }
};

// @route GET /api/ai/retrospective/:sprintId
exports.getRetrospective = async (req, res, next) => {
  try {
    const result = await aiEngine.generateRetrospective(req.user.organizationId, req.params.sprintId);
    res.json(result);
  } catch (error) { next(error); }
};

// @route GET /api/ai/prioritize/:sprintId
exports.getPrioritization = async (req, res, next) => {
  try {
    const result = await aiEngine.suggestPrioritization(req.user.organizationId, req.params.sprintId);
    res.json(result);
  } catch (error) { next(error); }
};

// @route GET /api/ai/insights/:projectId
exports.getInsights = async (req, res, next) => {
  try {
    const result = await aiEngine.getInsights(req.user.organizationId, req.params.projectId);
    res.json(result);
  } catch (error) { next(error); }
};

// @route POST /api/ai/train
exports.trainModels = async (req, res, next) => {
  try {
    // Train rule-based models
    await aiEngine.trainModels(req.user.organizationId);

    // Also trigger ML microservice training (non-blocking)
    mlClient.trainModels(req.user.organizationId?.toString())
      .then(r => console.log('[ML Train]', r.status || 'triggered'))
      .catch(() => {}); // Silent fail — ML training is optional

    res.json({ message: 'Models trained successfully (rule-based + ML)' });
  } catch (error) { next(error); }
};

// @route POST /api/ai/upload-training-csv
exports.uploadTrainingCSV = async (req, res, next) => {
  try {
    const { type } = req.body;
    if (!type || !['sprint_history', 'completed_tasks'].includes(type)) {
      return res.status(400).json({ message: 'Invalid CSV type' });
    }

    if (!req.file) {
      return res.status(400).json({ message: 'No CSV file uploaded' });
    }

    // Parse CSV
    const fileContent = req.file.buffer.toString('utf-8');
    
    csvParse.parse(fileContent, {
      columns: true,
      skip_empty_lines: true,
      trim: true
    }, async (err, records) => {
      if (err) {
        return res.status(400).json({ message: 'Error parsing CSV file', error: err.message });
      }

      if (records.length === 0) {
        return res.status(400).json({ message: 'CSV file is empty' });
      }

      try {
        const result = await aiEngine.ingestCSVTrainingData(req.user.organizationId, type, records);
        
        // Calculate current totals and threshold status
        const totalSprints = await SprintHistory.countDocuments({ orgId: req.user.organizationId });
        const totalTasks = await Task.countDocuments({
          organizationId: req.user.organizationId,
          status: 'done',
          storyPoints: { $ne: null },
          completedAt: { $ne: null }
        });

        res.json({
          rowsInserted: result.inserted,
          modelsRetrained: result.modelsRetrained,
          totalAfterInsert: {
            sprintHistory: totalSprints,
            completedTasks: totalTasks
          },
          thresholdStatus: {
            velocity: { required: 3, have: totalSprints, unlocked: totalSprints >= 3 },
            risk: { required: 3, have: totalSprints, unlocked: totalSprints >= 3 },
            estimation: { required: 50, have: totalTasks, unlocked: totalTasks >= 50 },
            delay: { required: 20, have: totalTasks, unlocked: totalTasks >= 20 }
          }
        });
      } catch (ingestErr) {
        next(ingestErr);
      }
    });

  } catch (error) { next(error); }
};
