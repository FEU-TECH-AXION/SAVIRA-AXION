const express = require('express')
const router = express.Router()
const { getItems, createItem, getAnalysis } = require('../controllers/case_report_analysis.controller')
const { verifyToken } = require('../middleware/auth.middleware')
const authorize = require('../middleware/authorize.middleware')
const requireCaseReportAccess = require('../middleware/requireCaseReportAccess.middleware')
const { resolveCaseBody, resolveCaseParam } = require('../utils/casePublicIds')
const requireCaseAccess = authorize('Admin', 'Case Officer', 'Legal Personnel')

// Routes are kept thin or short since all the logic is in the controller
router.get('/', verifyToken, authorize('Admin'), getItems)
router.post('/', verifyToken, authorize('Admin', 'Case Officer'), resolveCaseBody('case_report_id'), requireCaseReportAccess, createItem)
router.get('/:caseReportId', verifyToken, resolveCaseParam('caseReportId'), requireCaseAccess, requireCaseReportAccess, getAnalysis)

module.exports = router
