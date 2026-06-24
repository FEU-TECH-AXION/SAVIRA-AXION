// SAVIRA/web/backend/src/services/notificationService.js
const { getMessaging } = require('../config/firebase');
const supabase = require('../config/supabase');

async function notifyUser(userId, { title, body, data = {} }) {
  const { data: tokens, error } = await supabase
    .from('device_tokens')
    .select('token, platform')
    .eq('user_id', userId);

  if (error) {
    console.error('[notifyUser] Failed to fetch tokens:', error.message);
    return;
  }

  if (!tokens?.length) return;

  const messaging = getMessaging();
  if (!messaging) {
    console.warn('[notifyUser] Push notifications skipped: Firebase Admin is not configured.');
    return;
  }

  const messages = tokens.map(({ token }) => ({
    token,
    notification: { title, body },
    data: Object.fromEntries(
      Object.entries(data).map(([k, v]) => [k, String(v)])
    ),
    webpush: {
      fcmOptions: { link: data.link || '/' },
    },
  }));

  let response;
  try {
    response = await messaging.sendEach(messages);
  } catch (error) {
    console.error('[notifyUser] Failed to send notifications:', error.message);
    return;
  }

  const invalidTokens = response.responses
    .map((r, i) => (!r.success ? tokens[i].token : null))
    .filter(Boolean);

  if (invalidTokens.length) {
    await supabase
      .from('device_tokens')
      .delete()
      .in('token', invalidTokens);

  }
}

module.exports = { notifyUser };
