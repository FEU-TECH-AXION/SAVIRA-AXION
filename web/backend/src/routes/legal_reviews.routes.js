const express = require('express')
const router = express.Router()
const { getByCase, updateByCase } = require('../controllers/legal_reviews.controller')

router.get('/case/:caseReportId', getByCase)
router.patch('/case/:caseReportId', updateByCase)

module.exports = router
