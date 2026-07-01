const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { randomUUID } = require('crypto');
const supabase = require('../config/supabase');
const { sendWelcomeEmail, sendVerificationCodeEmail } = require('../config/mailer');

const isProduction = process.env.NODE_ENV === 'production';
const VERIFICATION_DAILY_LIMIT = 15;
const VERIFICATION_EXPIRY_MINUTES = 10;
const VERIFICATION_RESEND_COOLDOWN_SECONDS = 60;

const COOKIE_OPTIONS = {
  httpOnly: true,
  secure: isProduction,
  sameSite: isProduction ? 'none' : 'lax',
  maxAge: 7 * 24 * 60 * 60 * 1000,
};

const USER_COOKIE_OPTIONS = {
  httpOnly: false,
  secure: isProduction,
  sameSite: isProduction ? 'none' : 'lax',
  maxAge: 7 * 24 * 60 * 60 * 1000,
};

function normalizeEmail(email) {
  return String(email || '').trim().toLowerCase();
}

function legacyDotlessGmailEmail(email) {
  const normalizedEmail = normalizeEmail(email);
  const [localPart, domain] = normalizedEmail.split('@');
  if (!localPart || !domain || !['gmail.com', 'googlemail.com'].includes(domain)) return null;

  const dotlessEmail = `${localPart.replace(/\./g, '')}@${domain}`;
  return dotlessEmail === normalizedEmail ? null : dotlessEmail;
}

async function findUserByEmail(email, select = '*, roles(role_name)') {
  const normalizedEmail = normalizeEmail(email);
  const { data: exactUser, error: exactError } = await supabase
    .from('users')
    .select(select)
    .eq('email', normalizedEmail)
    .maybeSingle();

  if (exactError || exactUser) return { data: exactUser, error: exactError };

  const legacyEmail = legacyDotlessGmailEmail(normalizedEmail);
  if (!legacyEmail) return { data: null, error: null };

  return supabase
    .from('users')
    .select(select)
    .eq('email', legacyEmail)
    .maybeSingle();
}

function todayIso() {
  return new Date().toISOString().slice(0, 10);
}

function makeCode() {
  return String(Math.floor(100000 + Math.random() * 900000));
}

function buildSessionResponse(user) {
  const token = jwt.sign(
    {
      id: user.user_id,
      email: user.email,
      role: user.roles?.role_name || user.role_name,
      role_name: user.roles?.role_name || user.role_name,
      role_id: user.role_id,
    },
    process.env.JWT_SECRET,
    { expiresIn: '7d' }
  );

  const { password: _, roles, ...safeUser } = user;
  return {
    token,
    flatUser: {
      ...safeUser,
      role_name: roles?.role_name || user.role_name || null,
    },
  };
}

async function attachRoleDetails(flatUser) {
  if (flatUser.role_name?.toLowerCase() === 'staff') {
    const { data: staffRecord } = await supabase
      .from('staff')
      .select('committee_id')
      .eq('user_id', flatUser.user_id)
      .maybeSingle();
    flatUser.committee_id = staffRecord?.committee_id ?? null;
  }
  if (flatUser.role_name?.toLowerCase() === 'legal personnel') {
    const { data: legalRecord } = await supabase
      .from('legal_personnels')
      .select('legal_personnel_id, legal_personnel_type')
      .eq('user_id', flatUser.user_id)
      .maybeSingle();
    flatUser.legal_personnel_id = legalRecord?.legal_personnel_id ?? null;
    flatUser.legal_personnel_type = legalRecord?.legal_personnel_type ?? null;
  }
  return flatUser;
}

async function ensureCanSendVerification(email, purpose) {
  const normalizedEmail = normalizeEmail(email);
  const { data: latest, error: latestError } = await supabase
    .from('email_verification_codes')
    .select('sent_at')
    .eq('email', normalizedEmail)
    .eq('purpose', purpose)
    .order('sent_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (latestError) throw latestError;
  if (latest?.sent_at) {
    const elapsedSeconds = Math.floor((Date.now() - new Date(latest.sent_at).getTime()) / 1000);
    const remainingSeconds = VERIFICATION_RESEND_COOLDOWN_SECONDS - elapsedSeconds;
    if (remainingSeconds > 0) {
      const err = new Error(`Please wait ${remainingSeconds} seconds before requesting another verification code.`);
      err.status = 429;
      err.retryAfter = remainingSeconds;
      throw err;
    }
  }

  const { count, error } = await supabase
    .from('email_verification_codes')
    .select('verification_id', { count: 'exact', head: true })
    .eq('email', normalizedEmail)
    .eq('purpose', purpose)
    .gte('sent_at', `${todayIso()}T00:00:00.000Z`);

  if (error) throw error;
  if ((count || 0) >= VERIFICATION_DAILY_LIMIT) {
    const err = new Error('Daily verification limit reached. Please try again tomorrow.');
    err.status = 429;
    throw err;
  }
}

async function createVerificationCode(email, purpose, metadata = {}) {
  const normalizedEmail = normalizeEmail(email);
  await ensureCanSendVerification(normalizedEmail, purpose);

  const code = makeCode();
  const { error } = await supabase
    .from('email_verification_codes')
    .insert([{
      verification_id: randomUUID(),
      email: normalizedEmail,
      code,
      purpose,
      metadata,
      expires_at: new Date(Date.now() + VERIFICATION_EXPIRY_MINUTES * 60 * 1000).toISOString(),
      sent_at: new Date().toISOString(),
    }]);
  if (error) throw error;

  await sendVerificationCodeEmail(normalizedEmail, code, purpose);
}

async function getLatestVerification(email, purpose) {
  const { data, error } = await supabase
    .from('email_verification_codes')
    .select('*')
    .eq('email', normalizeEmail(email))
    .eq('purpose', purpose)
    .order('sent_at', { ascending: false })
    .limit(1)
    .maybeSingle();
  if (error) throw error;
  return data;
}

async function getValidCode(email, purpose, code) {
  const { data, error } = await supabase
    .from('email_verification_codes')
    .select('*')
    .eq('email', normalizeEmail(email))
    .eq('purpose', purpose)
    .eq('code', String(code || ''))
    .is('used_at', null)
    .gt('expires_at', new Date().toISOString())
    .order('sent_at', { ascending: false })
    .limit(1)
    .maybeSingle();
  if (error) throw error;
  return data;
}

async function markCodeUsed(verificationId) {
  const { error } = await supabase
    .from('email_verification_codes')
    .update({ used_at: new Date().toISOString() })
    .eq('verification_id', verificationId);
  if (error) throw error;
}

async function sendSession(res, user, status = 200) {
  const { token, flatUser } = buildSessionResponse(user);
  await attachRoleDetails(flatUser);
  return res
    .cookie('token', token, COOKIE_OPTIONS)
    .cookie('user', JSON.stringify(flatUser), USER_COOKIE_OPTIONS)
    .status(status)
    .json({ user: flatUser, token });
}

const signup = async (req, res) => {
  try {
    const { firstName, lastName, email, password } = req.body;
    const normalizedEmail = normalizeEmail(email);

    const { data: existing } = await supabase
      .from('users')
      .select('user_id')
      .eq('email', normalizedEmail)
      .maybeSingle();

    if (existing) {
      return res.status(409).json({
        errors: [{ path: 'email', msg: 'Email is already registered.' }],
      });
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    const username = `${normalizedEmail.split('@')[0]}${Math.floor(Math.random() * 10000)}`;
    await createVerificationCode(normalizedEmail, 'signup', {
      firstName,
      lastName,
      password: hashedPassword,
      username,
    });

    res.status(202).json({
      verificationRequired: true,
      purpose: 'signup',
      email: normalizedEmail,
      message: 'Verification code sent. Enter it to finish creating your account.',
    });
  } catch (err) {
    console.error('[auth.signup]', err);
    res.status(err.status || 500).json({ error: err.message, retryAfter: err.retryAfter });
  }
};

const verifySignup = async (req, res) => {
  try {
    const { email, code } = req.body;
    const verification = await getValidCode(email, 'signup', code);
    if (!verification) return res.status(400).json({ error: 'Invalid or expired verification code.' });

    const metadata = verification.metadata || {};
    const { data: existing } = await supabase
      .from('users')
      .select('user_id')
      .eq('email', normalizeEmail(email))
      .maybeSingle();
    if (existing) return res.status(409).json({ error: 'Email is already registered.' });

    const { data: newUser, error } = await supabase
      .from('users')
      .insert([{
        user_id: randomUUID(),
        email: normalizeEmail(email),
        role_id: 1,
        first_name: metadata.firstName,
        last_name: metadata.lastName,
        user_name: metadata.username,
        password: metadata.password,
        is_email_verified: true,
      }])
      .select('*, roles(role_name)')
      .single();

    if (error) throw error;
    await markCodeUsed(verification.verification_id);
    sendWelcomeEmail(newUser.email, newUser.first_name).catch((err) => {
      console.error('Failed to send welcome email:', err);
    });

    return sendSession(res, newUser, 201);
  } catch (err) {
    res.status(err.status || 500).json({ error: err.message, retryAfter: err.retryAfter });
  }
};

const login = async (req, res) => {
  try {
    const { email, password } = req.body;

    const { data: user, error } = await findUserByEmail(email);

    if (error || !user) return res.status(401).json({ error: 'Invalid email or password.' });

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) return res.status(401).json({ error: 'Invalid email or password.' });

    if (!user.is_email_verified) {
      await createVerificationCode(user.email, 'login', { user_id: user.user_id });
      return res.status(202).json({
        verificationRequired: true,
        purpose: 'login',
        email: user.email,
        message: 'Verification code sent. Enter it to finish logging in.',
      });
    }

    return sendSession(res, user);
  } catch (err) {
    res.status(err.status || 500).json({ error: err.message, retryAfter: err.retryAfter });
  }
};

const verifyLogin = async (req, res) => {
  try {
    const { email, code } = req.body;
    const verification = await getValidCode(email, 'login', code);
    if (!verification) return res.status(400).json({ error: 'Invalid or expired verification code.' });

    const { data: user, error } = await supabase
      .from('users')
      .update({ is_email_verified: true })
      .eq('email', normalizeEmail(email))
      .select('*, roles(role_name)')
      .single();

    if (error || !user) return res.status(404).json({ error: 'User not found.' });
    await markCodeUsed(verification.verification_id);
    return sendSession(res, user);
  } catch (err) {
    res.status(err.status || 500).json({ error: err.message, retryAfter: err.retryAfter });
  }
};

const requestEmailChange = async (req, res) => {
  try {
    const normalizedEmail = normalizeEmail(req.body.newEmail);
    if (!normalizedEmail) return res.status(400).json({ error: 'New email is required.' });

    const { data: existing } = await supabase
      .from('users')
      .select('user_id')
      .eq('email', normalizedEmail)
      .maybeSingle();
    if (existing && String(existing.user_id) !== String(req.user.id)) {
      return res.status(409).json({ error: 'Email is already registered.' });
    }

    await createVerificationCode(normalizedEmail, 'email_change', { user_id: req.user.id });
    res.status(202).json({ email: normalizedEmail, message: 'Verification code sent to your new email.' });
  } catch (err) {
    res.status(err.status || 500).json({ error: err.message, retryAfter: err.retryAfter });
  }
};

const verifyEmailChange = async (req, res) => {
  try {
    const normalizedEmail = normalizeEmail(req.body.newEmail);
    const verification = await getValidCode(normalizedEmail, 'email_change', req.body.code);
    if (!verification || String(verification.metadata?.user_id) !== String(req.user.id)) {
      return res.status(400).json({ error: 'Invalid or expired verification code.' });
    }

    const { data: user, error } = await supabase
      .from('users')
      .update({ email: normalizedEmail, is_email_verified: true })
      .eq('user_id', req.user.id)
      .select('*, roles(role_name)')
      .single();
    if (error) throw error;
    await markCodeUsed(verification.verification_id);
    return sendSession(res, user);
  } catch (err) {
    res.status(err.status || 500).json({ error: err.message, retryAfter: err.retryAfter });
  }
};

const resendVerification = async (req, res) => {
  try {
    const email = normalizeEmail(req.body.email);
    const purpose = req.body.purpose;
    if (!email || !['signup', 'login'].includes(purpose)) {
      return res.status(400).json({ error: 'Email and verification purpose are required.' });
    }

    let metadata = {};
    if (purpose === 'signup') {
      const latest = await getLatestVerification(email, 'signup');
      if (!latest?.metadata?.password) {
        return res.status(404).json({ error: 'No pending signup verification found.' });
      }
      metadata = latest.metadata;
    }

    if (purpose === 'login') {
      const { data: user, error } = await findUserByEmail(email, 'user_id, is_email_verified');
      if (error) throw error;
      if (!user) return res.status(404).json({ error: 'User not found.' });
      if (user.is_email_verified) return res.status(400).json({ error: 'This account is already verified.' });
      metadata = { user_id: user.user_id };
    }

    await createVerificationCode(email, purpose, metadata);
    res.status(202).json({ message: 'A new verification code has been sent.' });
  } catch (err) {
    res.status(err.status || 500).json({ error: err.message, retryAfter: err.retryAfter });
  }
};

const logout = (req, res) => {
  res
    .clearCookie('token', COOKIE_OPTIONS)
    .clearCookie('user', USER_COOKIE_OPTIONS)
    .status(200)
    .json({ message: 'Logged out successfully.' });
};

const me = async (req, res) => {
  try {
    const { data: user, error } = await supabase
      .from('users')
      .select('*, roles(role_name)')
      .eq('user_id', req.user.id)
      .single();

    if (error || !user) return res.status(404).json({ error: 'User not found.' });
    return sendSession(res, user);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

module.exports = {
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
};
