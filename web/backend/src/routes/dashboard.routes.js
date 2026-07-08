const express = require('express')
const router = express.Router()
const { verifyToken } = require('../middleware/auth.middleware')
const authorize = require('../middleware/authorize.middleware')
const {
  getSummaryCounts,
  getAdminSummary,
  getCaseOfficerSummary,
  getLegalSummary,
  getStaffSummary,
} = require('../controllers/dashboard.controller')

router.get(
  '/summary-counts',
  verifyToken,
  authorize('Admin', 'Case Officer', 'Legal Personnel', 'Staff'),
  getSummaryCounts
)
router.get('/admin-summary', verifyToken, authorize('Admin'), getAdminSummary)
router.get('/case-officer-summary', verifyToken, authorize('Case Officer'), getCaseOfficerSummary)
router.get('/legal-summary', verifyToken, authorize('Legal Personnel'), getLegalSummary)
router.get('/staff-summary', verifyToken, authorize('Staff'), getStaffSummary)

module.exports = router
