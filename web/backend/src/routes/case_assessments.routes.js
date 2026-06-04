const express = require('express')
const router  = express.Router()
const { getItems, getItemsByCaseReport, createItem, patchLatestAssessment} = require('../controllers/case_assessments.controller')

router.get('/', getItems)
router.get('/case/:caseReportId', getItemsByCaseReport)
router.post('/', createItem)
router.patch('/case/:caseReportId', patchLatestAssessment);

module.exports = router