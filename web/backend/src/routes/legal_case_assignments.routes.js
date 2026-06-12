const express = require('express')
const router = express.Router()
const { getItems, createItem, assignCase,getAssignmentsByCase, } = require('../controllers/legal_case_assignments.controller')

router.get('/', getItems)
router.post('/', createItem)
router.post('/assign', assignCase)
router.get('/:caseReportId', getAssignmentsByCase)

module.exports = router