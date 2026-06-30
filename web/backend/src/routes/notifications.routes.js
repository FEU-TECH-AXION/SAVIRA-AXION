// SAVIRA/web/backend/src/routes/notifications.routes.js
const router = require('express').Router();
const supabase = require('../config/supabase');
const { verifyToken } = require('../middleware/auth.middleware');

function normalizeNotification(row) {
  return {
    id: row.notification_id || row.id,
    notification_id: row.notification_id || row.id,
    title: row.title || 'Notification',
    body: row.body || row.message || '',
    message: row.message || row.body || '',
    type: row.type || row.notification_type || 'system',
    link: row.link || row.data?.link || null,
    priority: row.priority || 'normal',
    read: Boolean(row.is_read ?? row.read),
    is_read: Boolean(row.is_read ?? row.read),
    important: Boolean(row.is_important || row.priority === 'important' || row.priority === 'high'),
    is_important: Boolean(row.is_important || row.priority === 'important' || row.priority === 'high'),
    created_at: row.created_at,
    data: row.data || {},
  };
}

router.get('/', verifyToken, async (req, res) => {
  const userId = req.user.id || req.user.user_id;
  const limit = Math.min(Number(req.query.limit) || 50, 100);

  const { data, error } = await supabase
    .from('notifications')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
    .limit(limit);

  if (error) return res.status(500).json({ error: error.message });
  res.json({ notifications: (data || []).map(normalizeNotification) });
});

router.patch('/read-all', verifyToken, async (req, res) => {
  const userId = req.user.id || req.user.user_id;

  const { error } = await supabase
    .from('notifications')
    .update({ is_read: true, read_at: new Date().toISOString() })
    .eq('user_id', userId)
    .eq('is_read', false);

  if (error) return res.status(500).json({ error: error.message });
  res.json({ success: true });
});

router.patch('/:id/read', verifyToken, async (req, res) => {
  const userId = req.user.id || req.user.user_id;

  const { error } = await supabase
    .from('notifications')
    .update({ is_read: true, read_at: new Date().toISOString() })
    .eq('user_id', userId)
    .eq('notification_id', req.params.id);

  if (error) return res.status(500).json({ error: error.message });
  res.json({ success: true });
});

router.delete('/', verifyToken, async (req, res) => {
  const userId = req.user.id || req.user.user_id;

  const { error } = await supabase
    .from('notifications')
    .delete()
    .eq('user_id', userId);

  if (error) return res.status(500).json({ error: error.message });
  res.json({ success: true });
});

router.post('/register-token', verifyToken, async (req, res) => {
  const { token, platform } = req.body;
  const userId = req.user.id;

  if (!token || !platform) {
    return res.status(400).json({ error: 'token and platform are required' });
  }

  const { data, error } = await supabase
    .from('device_tokens')
    .upsert(
      { user_id: userId, token, platform, updated_at: new Date() },
      { onConflict: 'token' }
    );

  if (error) return res.status(500).json({ error: error.message });
  res.json({ success: true });
});

router.delete('/register-token', verifyToken, async (req, res) => {
  const { token } = req.body;

  if (!token) return res.status(400).json({ error: 'token is required' });

  await supabase.from('device_tokens').delete().eq('token', token);
  res.json({ success: true });
});

router.delete('/:id', verifyToken, async (req, res) => {
  const userId = req.user.id || req.user.user_id;

  const { error } = await supabase
    .from('notifications')
    .delete()
    .eq('user_id', userId)
    .eq('notification_id', req.params.id);

  if (error) return res.status(500).json({ error: error.message });
  res.json({ success: true });
});

module.exports = router;
