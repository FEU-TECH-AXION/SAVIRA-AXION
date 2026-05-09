// backend/src/routes/auth.routes.js
const express = require('express');
const router = express.Router();
const { signup, login } = require('../controllers/auth.controller');
const { loginRules, signupRules, validateLogin } = require('../middleware/auth_validation.middleware');

router.post('/signup', signupRules, validateLogin, signup);
router.post('/login', loginRules, validateLogin, login); 

module.exports = router;