const express = require('express')
const router  = express.Router()
const {
  getHistory,
  submitStatusChange,
  approveStatusChange,
  rejectStatusChange,
} = require('../controllers/case_status_history.controller')
const { verifyToken } = require('../middleware/auth.middleware')
const authorize = require('../middleware/authorize.middleware')
const requireCaseReportAccess = require('../middleware/requireCaseReportAccess.middleware')

// Get status timeline for a case (staffView=true query param for staff)
router.get('/:caseReportId', verifyToken, requireCaseReportAccess, getHistory)

// Officer submits a status change — creates history + assessment rows
router.post('/', verifyToken, authorize('Admin', 'Case Officer'), submitStatusChange)

// Admin approves a pending status change
router.patch('/:historyId/approve', verifyToken, authorize('Admin'), approveStatusChange)

// Admin rejects a pending status change
router.patch('/:historyId/reject', verifyToken, authorize('Admin'), rejectStatusChange)

module.exports = router
