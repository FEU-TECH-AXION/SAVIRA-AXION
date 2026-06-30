const jwt = require('jsonwebtoken')
const bcrypt = require('bcrypt')
const express = require('express')
const multer = require('multer')
const { randomUUID } = require('crypto')
const router = express.Router()
const supabase = require('../config/supabase')
const { getItems, createItem, updateItem, uploadAvatar, loginUser, syncRole } = require('../controllers/users.controller')
const sendEmail = require('../config/mailer');
const { sendResetPasswordEmail } = require('../config/mailer')
const { verifyToken } = require('../middleware/auth.middleware')
const authorize = require('../middleware/authorize.middleware')
const PASSWORD_RESET_DAILY_LIMIT = 15
const PASSWORD_RESET_EXPIRY_MINUTES = 15
const avatarUpload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (req, file, callback) => {
    if (!file.mimetype.startsWith('image/')) {
      return callback(new Error('Only image files are allowed.'))
    }
    callback(null, true)
  },
})

const normalizeEmail = (email) => String(email || '').trim().toLowerCase()

const legacyDotlessGmailEmail = (email) => {
  const normalizedEmail = normalizeEmail(email)
  const [localPart, domain] = normalizedEmail.split('@')
  if (!localPart || !domain || !['gmail.com', 'googlemail.com'].includes(domain)) return null

  const dotlessEmail = `${localPart.replace(/\./g, '')}@${domain}`
  return dotlessEmail === normalizedEmail ? null : dotlessEmail
}

const findUserForPasswordReset = async (email) => {
  const normalizedEmail = normalizeEmail(email)
  const { data: exactUser, error: exactError } = await supabase
    .from('users')
    .select('user_id, email')
    .eq('email', normalizedEmail)
    .maybeSingle()

  if (exactError || exactUser) return { data: exactUser, error: exactError }

  const legacyEmail = legacyDotlessGmailEmail(normalizedEmail)
  if (!legacyEmail) return { data: null, error: null }

  return supabase
    .from('users')
    .select('user_id, email')
    .eq('email', legacyEmail)
    .maybeSingle()
}

const todayIso = () => new Date().toISOString().slice(0, 10)

const ensureCanSendPasswordReset = async (email) => {
  const { count, error } = await supabase
    .from('email_verification_codes')
    .select('verification_id', { count: 'exact', head: true })
    .eq('email', normalizeEmail(email))
    .eq('purpose', 'password_reset')
    .gte('sent_at', `${todayIso()}T00:00:00.000Z`)

  if (error) throw error
  if ((count || 0) >= PASSWORD_RESET_DAILY_LIMIT) {
    const err = new Error('Daily password reset limit reached. Please try again tomorrow.')
    err.status = 429
    throw err
  }
}

const recordPasswordResetEmail = async (email, userId) => {
  const { error } = await supabase
    .from('email_verification_codes')
    .insert([{
      verification_id: randomUUID(),
      email: normalizeEmail(email),
      code: 'password_reset',
      purpose: 'password_reset',
      metadata: { user_id: userId },
      expires_at: new Date(Date.now() + PASSWORD_RESET_EXPIRY_MINUTES * 60 * 1000).toISOString(),
      sent_at: new Date().toISOString(),
    }])

  if (error) throw error
}

router.get('/', verifyToken, authorize('Admin'), getItems)
router.post('/', verifyToken, authorize('Admin'), createItem)
router.put('/:id', verifyToken, updateItem)
router.patch('/:id', verifyToken, updateItem)
router.post('/:id/avatar', verifyToken, avatarUpload.single('profile_img'), uploadAvatar)
router.post('/login', loginUser)
router.post('/:userId/sync-role', verifyToken, authorize('Admin'), syncRole)

router.post('/forgot-password', async (req, res) => {
  const { email } = req.body || {}

  if (!email || typeof email !== 'string') {
    return res.status(400).json({ message: 'Email is required.' })
  }

  try {
    const { data: user, error: findError } = await findUserForPasswordReset(email)

    if (findError) throw findError
    if (!user) {
      return res.status(404).json({ message: 'Email not found.' })
    }

    await ensureCanSendPasswordReset(user.email)

    const resetToken = jwt.sign(
      { user_id: user.user_id, purpose: 'password_reset' },
      process.env.JWT_SECRET,
      { expiresIn: `${PASSWORD_RESET_EXPIRY_MINUTES}m` }
    )

    const resetLink = `${process.env.FRONTEND_URL}/resetPassword?token=${resetToken}`
    await sendResetPasswordEmail(user.email, resetLink)
    await recordPasswordResetEmail(user.email, user.user_id)

    res.json({ message: 'Reset link sent! Check your email.' })
  } catch (err) {
    console.error('Forgot-password error:', err)
    res.status(err.status || 500).json({ message: err.status ? err.message : 'Something went wrong. Please try again.' })
  }
})

router.post('/reset-password', async (req, res) => {
  const { token, password } = req.body || {}

  if (!token || !password) {
    return res.status(400).json({ message: 'Token and new password are required.' })
  }

  let decoded
  try {
    decoded = jwt.verify(token, process.env.JWT_SECRET)
  } catch (err) {
    return res.status(400).json({ message: 'This reset link is invalid or has expired.' })
  }

  if (decoded.purpose !== 'password_reset' || !decoded.user_id) {
    return res.status(400).json({ message: 'This reset link is invalid or has expired.' })
  }

  try {
    const hashedPassword = await bcrypt.hash(password, 10)

    const { error: updateError } = await supabase
      .from('users')
      .update({ password: hashedPassword, must_change_password: false })
      .eq('user_id', decoded.user_id)

    if (updateError) throw updateError

    res.json({ message: 'Password reset successful.' })
  } catch (err) {
    console.error('Reset-password error:', err)
    res.status(500).json({ message: 'Something went wrong. Please try again.' })
  }
})

module.exports = router
