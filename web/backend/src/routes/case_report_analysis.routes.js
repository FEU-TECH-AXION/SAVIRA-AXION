const express = require('express')
const router = express.Router()
const { getItems, createItem, getAnalysis } = require('../controllers/case_report_analysis.controller')
const { verifyToken } = require('../middleware/auth.middleware')

// Routes are kept thin or short since all the logic is in the controller
router.get('/', getItems)
router.post('/', createItem)
router.get('/:caseReportId', verifyToken, getAnalysis)

module.exports = router