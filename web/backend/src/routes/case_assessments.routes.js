const express = require('express')
const router  = express.Router()
const { getItems, getItemsByCaseReport, createItem, recordAssessmentAction} = require('../controllers/case_assessments.controller')
const { verifyToken } = require('../middleware/auth.middleware')
const authorize = require('../middleware/authorize.middleware')
const requireCaseReportAccess = require('../middleware/requireCaseReportAccess.middleware')
const requireCaseAccess = authorize('Admin', 'Case Officer', 'Legal Personnel')

router.get('/', verifyToken, authorize('Admin'), getItems)
router.get('/case/:caseReportId', verifyToken, requireCaseReportAccess, getItemsByCaseReport)
router.post('/', verifyToken, authorize('Admin', 'Case Officer'), requireCaseReportAccess, createItem)
router.patch('/case/:caseReportId', verifyToken, authorize('Admin', 'Case Officer'), requireCaseReportAccess, recordAssessmentAction);

module.exports = router
