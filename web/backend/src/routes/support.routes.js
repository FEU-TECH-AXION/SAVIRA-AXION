const express = require('express');
const multer = require('multer');
const router = express.Router();
const { verifyToken } = require('../middleware/auth.middleware');
const {
  createContactMessage,
  createBugReport,
  listMessages,
  replyToMessage,
  markResolved,
  archiveMessage,
} = require('../controllers/support.controller');

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024 },
});

router.post('/contact', createContactMessage);
router.post('/report', verifyToken, upload.single('attachment'), createBugReport);
router.get('/messages', verifyToken, listMessages);
router.post('/messages/:id/reply', verifyToken, replyToMessage);
router.patch('/messages/:id/resolve', verifyToken, markResolved);
router.patch('/messages/:id/archive', verifyToken, archiveMessage);

module.exports = router;
