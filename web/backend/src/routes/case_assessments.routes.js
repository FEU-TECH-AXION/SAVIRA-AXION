const express = require('express')
const router  = express.Router()
const { getItems, getItemsByCaseReport, createItem, recordAssessmentAction} = require('../controllers/case_assessments.controller')

router.get('/', getItems)
router.get('/case/:caseReportId', getItemsByCaseReport)
router.post('/', createItem)
router.patch('/case/:caseReportId', recordAssessmentAction);

module.exports = router