// SAVIRA/web/backend/src/services/notificationService.js
const admin = require('../config/firebase');
const { supabase } = require('../config/supabase'); 

/**
 * Send FCM notification to all devices of a user
 * @param {string} userId - UUID of the target user
 * @param {{ title: string, body: string, data?: object }} payload
 */
async function notifyUser(userId, { title, body, data = {} }) {
  const { data: tokens, error } = await supabase
    .from('device_tokens')
    .select('token, platform')
    .eq('user_id', userId);

  if (error) {
    console.error('[notifyUser] Failed to fetch tokens:', error.message);
    return;
  }

  if (!tokens?.length) return; // user has no registered devices, skip silently

  const messages = tokens.map(({ token }) => ({
    token,
    notification: { title, body },
    data: Object.fromEntries(
      Object.entries(data).map(([k, v]) => [k, String(v)]) // FCM requires string values
    ),
    webpush: {
      fcmOptions: { link: data.link || '/' },
    },
  }));

  const response = await admin.messaging().sendEach(messages);

  // Remove tokens that FCM rejected (expired/unregistered devices)
  const invalidTokens = response.responses
    .map((r, i) => (!r.success ? tokens[i].token : null))
    .filter(Boolean);

  if (invalidTokens.length) {
    await supabase
      .from('device_tokens')
      .delete()
      .in('token', invalidTokens);

    console.log(`[notifyUser] Removed ${invalidTokens.length} invalid token(s)`);
  }
}

module.exports = { notifyUser };