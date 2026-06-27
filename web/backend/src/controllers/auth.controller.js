const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { randomUUID } = require('crypto');
const UserModel = require('../models/users.model');
const supabase = require('../config/supabase');
const { sendWelcomeEmail } = require('../config/mailer');

const isProduction = process.env.NODE_ENV === 'production';

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

// ── Signup ───────────────────────────────────────────────────────────────────
const signup = async (req, res) => {
  try {
    const { firstName, lastName, email, password } = req.body;

    // 1. Check duplicate email
    const { data: existing } = await supabase
      .from('users')
      .select('user_id')
      .eq('email', email)
      .single();

    if (existing)
      return res.status(409).json({
        errors: [{
          path: 'email',
          msg: 'Email is already registered.',
        }],
      });

    // 2. Auto-generate unique username
    let username = `${email.split('@')[0]}${Math.floor(Math.random() * 10000)}`;

    // 3. Hash password
    const hashedPassword = await bcrypt.hash(password, 10);

    // 4. Create user (role_id 1 = User by default)
    const { data: newUser, error } = await supabase
      .from('users')
      .insert([{
        user_id:    randomUUID(),
        email,
        role_id:    1,
        first_name: firstName,
        last_name:  lastName,
        user_name:  username,
        password:   hashedPassword,
      }])
      .select('*, roles(role_name)')
      .single();

    if (error) throw error;

    // Fire-and-forget — don't block signup on email delivery
    sendWelcomeEmail(newUser.email, newUser.first_name).catch((err) => {
      console.error('Failed to send welcome email:', err);
    });

    // 5. Generate JWT
    const token = jwt.sign(
      { id: newUser.user_id, role_id: newUser.role_id },
      process.env.JWT_SECRET,
      { expiresIn: '7d' }
    );

    // 6. Flatten and return safe user
    const { password: _, ...safeUser } = newUser;
    const flatUser = {
      ...safeUser,
      role_name: safeUser.roles?.role_name || null,
    };
    delete flatUser.roles;

    res
      .cookie('token', token, COOKIE_OPTIONS)
      .cookie('user', JSON.stringify(flatUser), USER_COOKIE_OPTIONS)
      .status(201)
      .json({ user: flatUser, token });

  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// ── Login ────────────────────────────────────────────────────────────────────
const login = async (req, res) => {
  try {
    const { email, password } = req.body;

    // 1. Find user with role name
    const { data: user, error } = await supabase
      .from('users')
      .select('*, roles(role_name)')
      .eq('email', email)
      .single();

    if (error || !user)
      return res.status(401).json({ error: 'Invalid email or password.' });

    // 2. Compare password
    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch)
      return res.status(401).json({ error: 'Invalid email or password.' });

    // 3. Generate JWT
    const token = jwt.sign(
      { id: user.user_id, role: user.roles?.role_name },
      process.env.JWT_SECRET,
      { expiresIn: '7d' }
    );

    // 4. Flatten and return safe user
    const { password: _, ...safeUser } = user;
    const flatUser = {
      ...safeUser,
      role_name: safeUser.roles?.role_name || null,
    };
    delete flatUser.roles;

    // 5. If staff, attach committee_id from the staff table
    if (flatUser.role_name?.toLowerCase() === 'staff') {
      const { data: staffRecord } = await supabase
        .from('staff')
        .select('committee_id')
        .eq('user_id', flatUser.user_id)
        .single();
      flatUser.committee_id = staffRecord?.committee_id ?? null;
    }

    res
      .cookie('token', token, COOKIE_OPTIONS)
      .cookie('user', JSON.stringify(flatUser), USER_COOKIE_OPTIONS)
      .status(200)
      .json({ user: flatUser, token });

  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// ── Logout ───────────────────────────────────────────────────────────────────
const logout = (req, res) => {
  res
    .clearCookie('token', COOKIE_OPTIONS)
    .clearCookie('user', USER_COOKIE_OPTIONS)
    .status(200)
    .json({ message: 'Logged out successfully.' });
};

// ── Me (verify session) ──────────────────────────────────────────────────────
const me = async (req, res) => {
  try {
    const { data: user, error } = await supabase
      .from('users')
      .select('*, roles(role_name)')
      .eq('user_id', req.user.id)
      .single();

    if (error || !user)
      return res.status(404).json({ error: 'User not found.' });

    const { password: _, ...safeUser } = user;
    const flatUser = {
      ...safeUser,
      role_name: safeUser.roles?.role_name || null,
    };
    delete flatUser.roles;

    // If staff, attach committee_id from the staff table
    if (flatUser.role_name?.toLowerCase() === 'staff') {
      const { data: staffRecord } = await supabase
        .from('staff')
        .select('committee_id')
        .eq('user_id', flatUser.user_id)
        .single();
      flatUser.committee_id = staffRecord?.committee_id ?? null;
    }

    res.status(200).json({ user: flatUser });

  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

module.exports = { signup, login, logout, me };