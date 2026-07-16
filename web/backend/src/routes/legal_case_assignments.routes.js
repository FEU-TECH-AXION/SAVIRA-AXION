const express = require('express')
const router = express.Router()
const { getItems, createItem, assignCase, bulkAssignCase, getAssignmentsByCase, removeAssignment } = require('../controllers/legal_case_assignments.controller')
const { verifyToken } = require('../middleware/auth.middleware')
const authorize = require('../middleware/authorize.middleware')
const requireCaseReportAccess = require('../middleware/requireCaseReportAccess.middleware')
const { resolveCaseBody, resolveCaseParam } = require('../utils/casePublicIds')

router.get('/', verifyToken, authorize('Admin'), getItems)
router.post('/', verifyToken, authorize('Admin'), resolveCaseBody('case_report_id'), createItem)
router.post('/assign',           verifyToken, authorize('Admin', 'Case Officer', 'Legal Personnel'), resolveCaseBody('case_report_id'), requireCaseReportAccess, assignCase)           // single
router.post('/assign-bulk',      verifyToken, authorize('Admin', 'Case Officer', 'Legal Personnel'), resolveCaseBody('case_report_id'), requireCaseReportAccess, bulkAssignCase)
router.delete('/:caseReportId/:legalPersonnelId', verifyToken, authorize('Admin'), resolveCaseParam('caseReportId'), removeAssignment)
router.get('/:caseReportId', verifyToken, resolveCaseParam('caseReportId'), authorize('Admin', 'Case Officer', 'Legal Personnel'), requireCaseReportAccess, getAssignmentsByCase)

module.exports = router
