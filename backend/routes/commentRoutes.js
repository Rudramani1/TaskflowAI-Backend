const router = require('express').Router();
const commentController = require('../controllers/commentController');
const authMiddleware = require('../middleware/authMiddleware');

router.use(authMiddleware);

router.post('/', commentController.createComment);
router.get('/', commentController.getComments);
router.delete('/:id', commentController.deleteComment);

module.exports = router;
