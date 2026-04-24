const router = require('express').Router();
const { body } = require('express-validator');
const authController = require('../controllers/authController');
const authMiddleware = require('../middleware/authMiddleware');

router.post('/signup', [
  body('name').trim().notEmpty().withMessage('Name is required'),
  body('email').isEmail().withMessage('Valid email is required'),
  body('password').isLength({ min: 6 }).withMessage('Password must be at least 6 characters')
], authController.signup);

router.post('/login', [
  body('email').isEmail().withMessage('Valid email is required'),
  body('password').notEmpty().withMessage('Password is required')
], authController.login);

router.post('/refresh', authController.refreshToken);
router.get('/me', authMiddleware, authController.getProfile);
router.put('/profile', authMiddleware, authController.updateProfile);
router.post('/organization', authMiddleware, authController.createOrganization);
router.post('/invite', authMiddleware, authController.inviteMember);
router.post('/join/:token', authController.joinOrganization);
router.get('/invite/:token/info', authController.getInviteInfo);
router.get('/members', authMiddleware, authController.getMembers);

module.exports = router;
