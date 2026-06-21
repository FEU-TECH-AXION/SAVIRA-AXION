const express = require('express')
const multer = require('multer')
const { verifyToken } = require('../middleware/auth.middleware')
const {
  replyToFollowUp,
  updateFollowUp,
} = require('../controllers/follow_ups.controller')

const router = express.Router()
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 },
})

router.post('/:id/messages', verifyToken, upload.single('file'), replyToFollowUp)
router.patch('/:id', verifyToken, updateFollowUp)

module.exports = router

