const express = require('express')
const router = express.Router()
const { getItems, createItem, submitReport, getUserReports, getAllCases } = require('../controllers/case_reports.controller')
const { verifyToken } = require('../middleware/auth.middleware')

// Routes are kept thin or short since all the logic is in the controller
router.get('/', getItems)
router.post('/', createItem)
router.post('/submit', verifyToken, submitReport)
router.get('/my-reports', verifyToken, getUserReports);
router.get('/all', verifyToken, getAllCases); // Admin route to get all cases, can be protected with additional admin middleware if needed

module.exports = router