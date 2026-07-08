const express = require('express')
const router = express.Router()
const { verifyToken } = require('../middleware/auth.middleware')
const authorize = require('../middleware/authorize.middleware')
const { getSummaryCounts } = require('../controllers/dashboard.controller')

router.get(
  '/summary-counts',
  verifyToken,
  authorize('Admin', 'Case Officer', 'Legal Personnel', 'Staff'),
  getSummaryCounts
)

module.exports = router
