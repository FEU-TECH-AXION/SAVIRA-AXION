// SAVIRA/web/backend/src/services/notificationService.js
const { getMessaging } = require('../config/firebase');
const supabase = require('../config/supabase');

function fireAndForget(promise, label) {
  promise.catch((error) => {
    console.error(`[notifications] ${label}:`, error.message);
  });
}

async function notifyUser(userId, { title, body, data = {} }) {
  const notificationPayload = {
    user_id: userId,
    title,
    body,
    message: body,
    type: data.type || data.notification_type || 'system',
    link: data.link || null,
    priority: data.priority || 'normal',
    data,
    is_read: false,
    is_important: data.important === true || data.priority === 'important' || data.priority === 'high',
    created_at: new Date().toISOString(),
  };

  const { error: insertError } = await supabase
    .from('notifications')
    .insert([notificationPayload]);

  if (insertError) {
    console.error('[notifyUser] Failed to save notification:', insertError.message);
  }

  const { data: tokens, error } = await supabase
    .from('device_tokens')
    .select('token, platform')
    .eq('user_id', userId);

  console.log('[notifyUser] tokens found:', tokens);  
  console.log('[notifyUser] fetch error:', error);     

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
    await supabase.from('device_tokens').delete().in('token', invalidTokens);
    console.log(`[notifyUser] Removed ${invalidTokens.length} invalid token(s)`);
  }
}

async function getUsersByRoleNames(roleNames = []) {
  const normalizedRoles = roleNames
    .map((role) => String(role || '').trim().toLowerCase())
    .filter(Boolean);

  if (normalizedRoles.length === 0) return [];

  const { data, error } = await supabase
    .from('users')
    .select('user_id, roles(role_name)')
    .eq('is_active', true);

  if (error) throw error;

  return (data || [])
    .filter((user) => normalizedRoles.includes(String(user.roles?.role_name || '').toLowerCase()))
    .map((user) => user.user_id)
    .filter(Boolean);
}

async function notifyRoleUsers(roleNames, notification) {
  const userIds = await getUsersByRoleNames(roleNames);
  await Promise.all(userIds.map((userId) => notifyUser(userId, notification)));
}

async function getCaseOwnerUserId(caseReportId) {
  const { data, error } = await supabase
    .from('case_reports')
    .select('complainants(user_id)')
    .eq('case_report_id', caseReportId)
    .maybeSingle();

  if (error) throw error;
  return data?.complainants?.user_id || null;
}

async function notifyCaseOwner(caseReportId, notification) {
  const userId = await getCaseOwnerUserId(caseReportId);
  if (!userId) return;
  await notifyUser(userId, notification);
}

async function getVolunteerApplicationOwnerUserId(applicationId) {
  const { data, error } = await supabase
    .from('volunteer_applications')
    .select('volunteer_applicants(user_id)')
    .eq('volunteer_application_id', applicationId)
    .maybeSingle();

  if (error) throw error;
  return data?.volunteer_applicants?.user_id || null;
}

async function notifyVolunteerApplicationOwner(applicationId, notification) {
  const userId = await getVolunteerApplicationOwnerUserId(applicationId);
  if (!userId) return;
  await notifyUser(userId, notification);
}

module.exports = {
  notifyUser,
  notifyRoleUsers,
  notifyCaseOwner,
  notifyVolunteerApplicationOwner,
  fireAndForget,
};
