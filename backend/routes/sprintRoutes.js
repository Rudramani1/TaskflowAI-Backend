const router = require('express').Router();
const sprintController = require('../controllers/sprintController');
const authMiddleware = require('../middleware/authMiddleware');

router.use(authMiddleware);

router.get('/', sprintController.getSprints);
router.get('/:id', sprintController.getSprint);
router.post('/', sprintController.createSprint);
router.put('/:id', sprintController.updateSprint);
router.post('/:id/close', sprintController.closeSprint);
router.get('/:id/burndown', sprintController.getBurndown);

module.exports = router;
