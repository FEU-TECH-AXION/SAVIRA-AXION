const express = require('express')
const router  = express.Router()
const {
  getHistory,
  getBatchApprovedHistory,
  submitStatusChange,
  submitStatusOverride,
  approveStatusChange,
  rejectStatusChange,
} = require('../controllers/case_status_history.controller')
const { verifyToken } = require('../middleware/auth.middleware')
const authorize = require('../middleware/authorize.middleware')
const requireCaseReportAccess = require('../middleware/requireCaseReportAccess.middleware')
const { resolveCaseBody, resolveCaseParam, resolveCaseQueryArray } = require('../utils/casePublicIds')

// Batched approved status timeline for report analytics
router.get('/batch/approved', verifyToken, authorize('Admin'), resolveCaseQueryArray('caseIds'), getBatchApprovedHistory)

// Get status timeline for a case (staffView=true query param for staff)
router.get('/:caseReportId', verifyToken, resolveCaseParam('caseReportId'), requireCaseReportAccess, getHistory)

// Officer submits a status change — creates history + assessment rows
router.post('/', verifyToken, authorize('Admin', 'Case Officer', 'Legal Personnel'), resolveCaseBody('case_report_id'), requireCaseReportAccess, submitStatusChange)

router.post('/override', verifyToken, authorize('Admin'), resolveCaseBody('case_report_id'), submitStatusOverride)

// Admin approves a pending status change
router.patch('/:historyId/approve', verifyToken, authorize('Admin'), approveStatusChange)

// Admin rejects a pending status change
router.patch('/:historyId/reject', verifyToken, authorize('Admin'), rejectStatusChange)

module.exports = router
