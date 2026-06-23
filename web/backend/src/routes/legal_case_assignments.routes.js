const express = require('express')
const router = express.Router()
const { getItems, createItem, assignCase, bulkAssignCase, getAssignmentsByCase, removeAssignment } = require('../controllers/legal_case_assignments.controller')
const { verifyToken } = require('../middleware/auth.middleware')

router.get('/', getItems)
router.post('/', createItem)
router.post('/assign',           verifyToken, assignCase)           // single
router.post('/assign-bulk',      verifyToken, bulkAssignCase)
router.delete('/:caseReportId/:legalPersonnelId', verifyToken, removeAssignment)
router.get('/:caseReportId', verifyToken, getAssignmentsByCase)

module.exports = router
