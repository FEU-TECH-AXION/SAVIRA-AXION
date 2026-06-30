const { randomUUID } = require('crypto');
const supabase = require('../config/supabase');
const { sendSupportReplyEmail } = require('../config/mailer');
const { fireAndForget, notifyRoleUsers } = require('../services/notificationService');

const ATTACHMENT_BUCKET = 'case-evidence';

function clean(value) {
  return String(value || '').trim();
}

function isAdmin(req) {
  return String(req.user?.role || req.user?.role_name || '').toLowerCase() === 'admin' || Number(req.user?.role_id) === 3;
}

async function getReporterProfile(req) {
  const userId = req.user?.id || req.user?.user_id || req.body.user_id || null;
  if (!userId) return null;

  const { data, error } = await supabase
    .from('users')
    .select('user_id, first_name, last_name, email')
    .eq('user_id', userId)
    .maybeSingle();
  if (error) throw error;
  return data;
}

async function uploadSupportAttachment(messageId, file) {
  if (!file) return {};

  const extension = file.originalname.includes('.')
    ? `.${file.originalname.split('.').pop()}`
    : '';
  const path = `support-messages/${messageId}/${randomUUID()}${extension}`;
  const { error } = await supabase.storage
    .from(ATTACHMENT_BUCKET)
    .upload(path, file.buffer, { contentType: file.mimetype, upsert: false });
  if (error) throw error;

  return {
    attachment_name: file.originalname,
    attachment_path: path,
    attachment_mime_type: file.mimetype,
  };
}

async function addAttachmentUrls(messages) {
  const paths = (messages || []).map((message) => message.attachment_path).filter(Boolean);
  if (paths.length === 0) return messages;

  const { data } = await supabase.storage
    .from(ATTACHMENT_BUCKET)
    .createSignedUrls(paths, 60 * 60);
  const urlByPath = new Map((data || []).map((item) => [item.path, item.signedUrl]));

  return messages.map((message) => ({
    ...message,
    attachment_url: urlByPath.get(message.attachment_path) || null,
  }));
}

const createContactMessage = async (req, res) => {
  try {
    const payload = {
      message_id: randomUUID(),
      source: 'contact',
      status: 'open',
      first_name: clean(req.body.firstName),
      last_name: clean(req.body.lastName),
      email: clean(req.body.email).toLowerCase(),
      phone: clean(req.body.phone),
      subject: clean(req.body.subject),
      message: clean(req.body.message),
    };

    if (!payload.email || !payload.message) {
      return res.status(400).json({ error: 'Email and message are required.' });
    }

    const { data, error } = await supabase
      .from('support_messages')
      .insert([payload])
      .select('*')
      .single();
    if (error) throw error;
    fireAndForget(
      notifyRoleUsers(['Admin'], {
        title: 'New contact message',
        body: `${payload.first_name || payload.email || 'Someone'} sent a contact form submission.`,
        data: {
          type: 'support_message',
          support_message_id: data.message_id,
          link: '/support-messages',
          priority: 'high',
        },
      }),
      'Failed to notify admins about contact message'
    );
    res.status(201).json({ data });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

const createBugReport = async (req, res) => {
  try {
    const messageId = randomUUID();
    const reporter = await getReporterProfile(req);
    const attachment = await uploadSupportAttachment(messageId, req.file);
    const payload = {
      message_id: messageId,
      source: 'bug_report',
      status: 'open',
      user_id: reporter?.user_id || req.user?.id || req.body.user_id || null,
      first_name: clean(reporter?.first_name || req.user?.first_name || req.body.firstName),
      last_name: clean(reporter?.last_name || req.user?.last_name || req.body.lastName),
      email: clean(reporter?.email || req.user?.email || req.body.email).toLowerCase(),
      subject: clean(req.body.issue_type || 'Bug report'),
      message: clean(req.body.description),
      page_url: clean(req.body.page_url),
      ...attachment,
    };

    if (!payload.message) return res.status(400).json({ error: 'Description is required.' });

    const { data, error } = await supabase
      .from('support_messages')
      .insert([payload])
      .select('*')
      .single();
    if (error) throw error;
    const [messageWithUrl] = await addAttachmentUrls([data]);
    fireAndForget(
      notifyRoleUsers(['Admin'], {
        title: 'New bug report',
        body: `${payload.first_name || payload.email || 'A user'} submitted a bug report.`,
        data: {
          type: 'bug_report',
          support_message_id: data.message_id,
          link: '/support-messages',
          priority: 'high',
        },
      }),
      'Failed to notify admins about bug report'
    );
    res.status(201).json({ data: messageWithUrl });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

const listMessages = async (req, res) => {
  try {
    if (!isAdmin(req)) return res.status(403).json({ error: 'Forbidden' });

    let query = supabase
      .from('support_messages')
      .select('*')
      .order('created_at', { ascending: false });

    if (req.query.source && req.query.source !== 'all') query = query.eq('source', req.query.source);
    if (req.query.status && req.query.status !== 'all') query = query.eq('status', req.query.status);

    const { data, error } = await query;
    if (error) throw error;
    const messages = await addAttachmentUrls(data || []);
    res.json({ data: messages });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

const replyToMessage = async (req, res) => {
  try {
    if (!isAdmin(req)) return res.status(403).json({ error: 'Forbidden' });

    const { id } = req.params;
    const { subject, message } = req.body;
    if (!clean(message)) return res.status(400).json({ error: 'Reply message is required.' });

    const { data: supportMessage, error: findError } = await supabase
      .from('support_messages')
      .select('*')
      .eq('message_id', id)
      .single();
    if (findError || !supportMessage) return res.status(404).json({ error: 'Message not found.' });

    await sendSupportReplyEmail(supportMessage.email, subject || `Re: ${supportMessage.subject || 'SAVIRA support'}`, message);

    const replies = Array.isArray(supportMessage.replies) ? supportMessage.replies : [];
    const { data, error } = await supabase
      .from('support_messages')
      .update({
        replies: [
          ...replies,
          {
            subject: subject || '',
            message,
            replied_at: new Date().toISOString(),
            replied_by: req.user.id,
          },
        ],
        status: 'replied',
        updated_at: new Date().toISOString(),
      })
      .eq('message_id', id)
      .select('*')
      .single();
    if (error) throw error;
    const [messageWithUrl] = await addAttachmentUrls([data]);
    res.json({ data: messageWithUrl });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

const markResolved = async (req, res) => {
  try {
    if (!isAdmin(req)) return res.status(403).json({ error: 'Forbidden' });

    const { data, error } = await supabase
      .from('support_messages')
      .update({
        status: 'resolved',
        resolved_at: new Date().toISOString(),
        resolved_by: req.user.id,
        updated_at: new Date().toISOString(),
      })
      .eq('message_id', req.params.id)
      .select('*')
      .single();
    if (error) throw error;
    const [messageWithUrl] = await addAttachmentUrls([data]);
    res.json({ data: messageWithUrl });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

module.exports = {
  createContactMessage,
  createBugReport,
  listMessages,
  replyToMessage,
  markResolved,
};
