const express = require('express')
const router  = express.Router()
const {
  getHistory,
  submitStatusChange,
  approveStatusChange,
  rejectStatusChange,
} = require('../controllers/case_status_history.controller')

// Get status timeline for a case (staffView=true query param for staff)
router.get('/:caseReportId', getHistory)

// Officer submits a status change — creates history + assessment rows
router.post('/', submitStatusChange)

// Admin approves a pending status change
router.patch('/:historyId/approve', approveStatusChange)

// Admin rejects a pending status change
router.patch('/:historyId/reject', rejectStatusChange)

module.exports = router