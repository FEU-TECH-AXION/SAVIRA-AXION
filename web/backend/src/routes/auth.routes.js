// backend/src/routes/auth.routes.js
const express = require('express');
const router = express.Router();
const { signup, login, logout, me } = require('../controllers/auth.controller');
const { loginRules, signupRules, validateInput } = require('../middleware/auth_validation.middleware');
const { verifyToken, authorize } = require('../middleware/auth.middleware');

router.post('/signup', signupRules, validateInput, signup);
router.post('/login', loginRules, validateInput, login);
router.post('/logout', verifyToken, logout);
router.get('/me', verifyToken, me);

// router.get('/cases', verifyToken, authorize('admin', 'case_officer'), getCases);

module.exports = router;