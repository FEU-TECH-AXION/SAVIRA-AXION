const express = require('express')
const router = express.Router()
const { getItems, createItem, getAnalysis } = require('../controllers/case_report_analysis.controller')
const { verifyToken } = require('../middleware/auth.middleware')
const authorize = require('../middleware/authorize.middleware')
const requireCaseAccess = authorize('Admin', 'Case Officer', 'Legal Personnel')

// Routes are kept thin or short since all the logic is in the controller
router.get('/', verifyToken, requireCaseAccess, getItems)
router.post('/', verifyToken, authorize('Admin', 'Case Officer'), createItem)
router.get('/:caseReportId', verifyToken, requireCaseAccess, getAnalysis)

module.exports = router
