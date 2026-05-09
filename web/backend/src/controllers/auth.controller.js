const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { v4: uuidv4 } = require('uuid');
const UserModel = require('../models/users.model');
const supabase = require('../config/supabase');

// TODO: Fix Login and Logout to set httpOnly cookies and return user data in response
// TODO: SET SECURE: true IN PRODUCTION AND USE HTTPS TO ENABLE SECURE COOKIES

const COOKIE_OPTIONS = {
  httpOnly: true,
  // secure: process.env.NODE_ENV === 'production',
  secure: false, // TODO: Set to true in production when using HTTPS
  sameSite: 'lax',
  maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
  domain: 'localhost', // Allow cross-origin cookie sharing in development
};

const USER_COOKIE_OPTIONS = {
  httpOnly: false, // Allow client-side access to user data
  secure: false,
  sameSite: 'lax',
  maxAge: 7 * 24 * 60 * 60 * 1000,
  domain: 'localhost',
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
        user_id:    uuidv4(),
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
      .json({ user: flatUser });

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
      { id: user.user_id, role_id: user.role_id },
      process.env.JWT_SECRET,
      { expiresIn: '7d' }
    );

    console.log('JWT_SECRET:', process.env.JWT_SECRET);
    console.log('SUPABASE_ANON_KEY:', process.env.SUPABASE_ANON_KEY);

    // 4. Flatten and return safe user
    const { password: _, ...safeUser } = user;
    const flatUser = {
      ...safeUser,
      role_name: safeUser.roles?.role_name || null,
    };
    delete flatUser.roles;

    res
      .cookie('token', token, COOKIE_OPTIONS)
      .cookie('user', JSON.stringify(flatUser), USER_COOKIE_OPTIONS)
      .status(200)
      .json({ user: flatUser });

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

    res.status(200).json({ user: flatUser });

  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

module.exports = { signup, login, logout, me };