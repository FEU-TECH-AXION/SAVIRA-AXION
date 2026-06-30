// backend/src/routes/auth.routes.js
const express = require('express');
const bcrypt = require('bcryptjs');
const router = express.Router();
const supabase = require('../config/supabase');
const {
  signup,
  verifySignup,
  login,
  verifyLogin,
  resendVerification,
  requestEmailChange,
  verifyEmailChange,
  logout,
  me,
  sendSession,
} = require('../controllers/auth.controller');
const { loginRules, signupRules, validateInput } = require('../middleware/auth_validation.middleware');
const { verifyToken } = require('../middleware/auth.middleware');
const authorize = require('../middleware/authorize.middleware');

router.get('/debug-env', verifyToken, authorize('Admin'), (req, res) => {
  res.json({ NODE_ENV: process.env.NODE_ENV });
});
router.post('/signup', signupRules, validateInput, signup);
router.post('/signup/verify', verifySignup);
router.post('/login', loginRules, validateInput, login);
router.post('/login/verify', verifyLogin);
router.post('/verification/resend', resendVerification);
router.post('/email-change/request', verifyToken, requestEmailChange);
router.post('/email-change/verify', verifyToken, verifyEmailChange);
router.post('/change-expired-password', verifyToken, async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body || {};
    if (!currentPassword || !newPassword) {
      return res.status(400).json({ error: 'Current password and new password are required.' });
    }

    const { data: user, error } = await supabase
      .from('users')
      .select('*, roles(role_name)')
      .eq('user_id', req.user.id)
      .single();

    if (error || !user) return res.status(404).json({ error: 'User not found.' });
    if (!user.must_change_password) {
      return res.status(400).json({ error: 'Your password is already up to date.' });
    }

    const currentMatches = await bcrypt.compare(currentPassword, user.password);
    if (!currentMatches) {
      return res.status(401).json({ error: 'Current password is incorrect.' });
    }

    const sameAsCurrent = await bcrypt.compare(newPassword, user.password);
    if (sameAsCurrent) {
      return res.status(400).json({ error: 'Please choose a password different from the temporary password.' });
    }

    const hashedPassword = await bcrypt.hash(newPassword, 10);
    const { data: updatedUser, error: updateError } = await supabase
      .from('users')
      .update({ password: hashedPassword, must_change_password: false })
      .eq('user_id', req.user.id)
      .select('*, roles(role_name)')
      .single();

    if (updateError) throw updateError;
    return sendSession(res, updatedUser);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});
router.post('/logout', logout);
router.get('/me', verifyToken, me);

// router.get('/cases', verifyToken, authorize('admin', 'case_officer'), getCases);

module.exports = router;
