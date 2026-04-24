const router = require('express').Router();
const aiController = require('../controllers/aiController');
const authMiddleware = require('../middleware/authMiddleware');
const adminMiddleware = require('../middleware/adminMiddleware');
const multer = require('multer');
const upload = multer();

router.use(authMiddleware);

// Instant features (work from day 1)
router.post('/estimate-points', aiController.estimatePoints);
router.get('/sprint-risk/:sprintId', aiController.getSprintRisk);
router.get('/delays/:projectId', aiController.getDelays);
router.get('/workload', aiController.getWorkload);
router.get('/bottlenecks/:projectId', aiController.getBottlenecks);
router.get('/suggest-assignee/:projectId', aiController.suggestAssignee);
router.get('/insights/:projectId', aiController.getInsights);

// Data-gated features (demo seeded, unlock with real data)
router.get('/velocity/:projectId', aiController.getVelocity);
router.get('/productivity/:projectId', aiController.getProductivity);
router.get('/retrospective/:sprintId', aiController.getRetrospective);
router.get('/prioritize/:sprintId', aiController.getPrioritization);

// Model management
router.post('/train', aiController.trainModels);
router.post('/upload-training-csv', adminMiddleware, upload.single('csvFile'), aiController.uploadTrainingCSV);

module.exports = router;
