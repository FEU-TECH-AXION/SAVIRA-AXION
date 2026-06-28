// backend/src/routes/auth.routes.js
const express = require('express');
const router = express.Router();
const { signup, login, logout, me } = require('../controllers/auth.controller');
const { loginRules, signupRules, validateInput } = require('../middleware/auth_validation.middleware');
const { verifyToken } = require('../middleware/auth.middleware');
const authorize = require('../middleware/authorize.middleware');

router.get('/debug-env', verifyToken, authorize('Admin'), (req, res) => {
  res.json({ NODE_ENV: process.env.NODE_ENV });
});
router.post('/signup', signupRules, validateInput, signup);
router.post('/login', loginRules, validateInput, login);
router.post('/logout', logout);
router.get('/me', verifyToken, me);

// router.get('/cases', verifyToken, authorize('admin', 'case_officer'), getCases);

module.exports = router;
