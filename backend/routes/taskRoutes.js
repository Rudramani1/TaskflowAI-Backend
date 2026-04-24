const router = require('express').Router();
const taskController = require('../controllers/taskController');
const authMiddleware = require('../middleware/authMiddleware');

router.use(authMiddleware);

router.get('/', taskController.getTasks);
router.get('/:id', taskController.getTask);
router.post('/', taskController.createTask);
router.put('/:id', taskController.updateTask);
router.delete('/:id', taskController.deleteTask);
router.put('/:id/subtasks', taskController.updateSubtasks);
router.put('/:id/checklist', taskController.updateChecklist);
router.patch('/reorder', taskController.reorderTasks);
router.get('/:id/activity', taskController.getTaskActivity);

module.exports = router;
