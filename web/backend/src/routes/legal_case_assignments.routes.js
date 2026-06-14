const express = require('express')
const router = express.Router()
const { getItems, createItem, assignCase, bulkAssignCase, getAssignmentsByCase, } = require('../controllers/legal_case_assignments.controller')

router.get('/', getItems)
router.post('/', createItem)
router.post('/assign',           assignCase)           // single
router.post('/assign-bulk',      bulkAssignCase)
router.get('/:caseReportId', getAssignmentsByCase)

module.exports = router