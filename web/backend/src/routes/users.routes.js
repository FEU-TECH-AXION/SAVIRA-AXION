const express = require('express')
const router = express.Router()
const supabase = require('../config/supabase')
const { getItems, createItem, loginUser } = require('../controllers/users.controller')
const sendEmail = require('../config/mailer');

router.get('/', getItems)
router.post('/', createItem)
router.post('/login', loginUser)
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