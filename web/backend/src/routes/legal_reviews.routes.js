const express = require('express')
const router = express.Router()
const { getManagement, getDeadlines, getByCase, getCalendarByCase, updateByCase } = require('../controllers/legal_reviews.controller')
const { verifyToken } = require('../middleware/auth.middleware')
const authorize = require('../middleware/authorize.middleware')
const requireCaseReportAccess = require('../middleware/requireCaseReportAccess.middleware')

router.get('/management', verifyToken, authorize('Admin', 'Legal Personnel'), getManagement)
router.get('/deadlines', verifyToken, authorize('Admin', 'Legal Personnel'), getDeadlines)
router.get('/case/:caseReportId/calendar', verifyToken, requireCaseReportAccess, getCalendarByCase)
router.get('/case/:caseReportId', verifyToken, authorize('Admin', 'Case Officer', 'Legal Personnel'), requireCaseReportAccess, getByCase)
router.patch('/case/:caseReportId', verifyToken, authorize('Admin', 'Legal Personnel'), requireCaseReportAccess, updateByCase)

module.exports = router
