const jwt = require('jsonwebtoken')
const bcrypt = require('bcrypt')
const express = require('express')
const router = express.Router()
const supabase = require('../config/supabase')
const { getItems, createItem, updateItem, loginUser, syncRole } = require('../controllers/users.controller')
const sendEmail = require('../config/mailer');
const { sendResetPasswordEmail } = require('../config/mailer')
const { verifyToken } = require('../middleware/auth.middleware')

router.get('/', getItems)
router.post('/', createItem)
router.put('/:id', verifyToken, updateItem)
router.post('/login', loginUser)
router.post('/:userId/sync-role', verifyToken, syncRole)

router.post('/forgot-password', async (req, res) => {
  const { email } = req.body || {}

  if (!email || typeof email !== 'string') {
    return res.status(400).json({ message: 'Email is required.' })
  }

  try {
    const { data: user, error: findError } = await supabase
      .from('users')
      .select('user_id, email')
      .eq('email', email)
      .maybeSingle()

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
