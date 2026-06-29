const jwt = require('jsonwebtoken')
const bcrypt = require('bcrypt')
const express = require('express')
const multer = require('multer')
const router = express.Router()
const supabase = require('../config/supabase')
const { getItems, createItem, updateItem, uploadAvatar, loginUser, syncRole } = require('../controllers/users.controller')
const sendEmail = require('../config/mailer');
const { sendResetPasswordEmail } = require('../config/mailer')
const { verifyToken } = require('../middleware/auth.middleware')
const authorize = require('../middleware/authorize.middleware')
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

    const resetToken = jwt.sign(
      { user_id: user.user_id, purpose: 'password_reset' },
      process.env.JWT_SECRET,
      { expiresIn: '15m' }
    )

    const resetLink = `${process.env.FRONTEND_URL}/resetPassword?token=${resetToken}`
    await sendResetPasswordEmail(user.email, resetLink)

    res.json({ message: 'Reset link sent! Check your email.' })
  } catch (err) {
    console.error('Forgot-password error:', err)
    res.status(500).json({ message: 'Something went wrong. Please try again.' })
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
      .update({ password: hashedPassword })
      .eq('user_id', decoded.user_id)

    if (updateError) throw updateError

    res.json({ message: 'Password reset successful.' })
  } catch (err) {
    console.error('Reset-password error:', err)
    res.status(500).json({ message: 'Something went wrong. Please try again.' })
  }
})

module.exports = router
