const express = require('express')
const router = express.Router()
const supabase = require('../config/supabase')
const { getItems, createItem, loginUser, syncRole } = require('../controllers/users.controller')
const sendEmail = require('../config/mailer');
const { verifyToken } = require('../middleware/auth.middleware')

router.get('/', getItems)
router.post('/', createItem)
router.post('/login', loginUser)
router.post('/:userId/sync-role', verifyToken, syncRole)
const { createClient } = require('@supabase/supabase-js');

router.post('/forgot-password', async (req, res) => {
  const { email } = req.body;

  const { error } = await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: `${process.env.FRONTEND_URL}/resetPassword`,
  });

  if (error) console.error(error);

  res.json({ message: 'If that email exists, a reset link has been sent.' });
});

module.exports = router