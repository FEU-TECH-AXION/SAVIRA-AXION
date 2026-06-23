// SAVIRA/web/backend/src/routes/notifications.routes.js
const router = require('express').Router();
const { supabase } = require('../config/supabase'); 
const { verifyToken } = require('../middleware/auth.middleware');

// POST /api/notifications/register-token
// Called by web/mobile after they get an FCM token
router.post('/register-token', verifyToken, async (req, res) => {
  const { token, platform } = req.body;
  const userId = req.user.id;

  if (!token || !platform) {
    return res.status(400).json({ error: 'token and platform are required' });
  }

  const { error } = await supabase
    .from('device_tokens')
    .upsert(
      { user_id: userId, token, platform, updated_at: new Date() },
      { onConflict: 'token' }
    );

  if (error) return res.status(500).json({ error: error.message });
  res.json({ success: true });
});

// DELETE /api/notifications/register-token
// Called on logout to stop sending notifications to this device
router.delete('/register-token', verifyToken, async (req, res) => {
  const { token } = req.body;

  if (!token) return res.status(400).json({ error: 'token is required' });

  await supabase.from('device_tokens').delete().eq('token', token);
  res.json({ success: true });
});

module.exports = router;