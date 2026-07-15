const express = require('express')
const router = express.Router()
const { getItems, createItem, assignCase, bulkAssignCase, getAssignmentsByCase, removeAssignment } = require('../controllers/legal_case_assignments.controller')
const { verifyToken } = require('../middleware/auth.middleware')
const authorize = require('../middleware/authorize.middleware')
const requireCaseReportAccess = require('../middleware/requireCaseReportAccess.middleware')

router.get('/', verifyToken, authorize('Admin'), getItems)
router.post('/', verifyToken, authorize('Admin'), createItem)
router.post('/assign',           verifyToken, authorize('Admin', 'Case Officer', 'Legal Personnel'), requireCaseReportAccess, assignCase)           // single
router.post('/assign-bulk',      verifyToken, authorize('Admin', 'Case Officer', 'Legal Personnel'), requireCaseReportAccess, bulkAssignCase)
router.delete('/:caseReportId/:legalPersonnelId', verifyToken, authorize('Admin'), removeAssignment)
router.get('/:caseReportId', verifyToken, authorize('Admin', 'Case Officer', 'Legal Personnel'), requireCaseReportAccess, getAssignmentsByCase)

module.exports = router
