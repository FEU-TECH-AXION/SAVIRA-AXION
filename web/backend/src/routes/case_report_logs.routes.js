const express = require('express')
const router = express.Router()
const { getItems, getItemsByCase, createItem, updateItem, deleteItem } = require('../controllers/case_report_logs.controller')
const { verifyToken } = require('../middleware/auth.middleware')
const authorize = require('../middleware/authorize.middleware')
const requireCaseReportAccess = require('../middleware/requireCaseReportAccess.middleware')
const requireCaseAccess = authorize('Admin', 'Case Officer', 'Legal Personnel')

// Routes are kept thin or short since all the logic is in the controller
router.get('/case/:caseReportId', verifyToken, requireCaseReportAccess, getItemsByCase)
router.get('/', verifyToken, requireCaseAccess, getItems)
router.post('/', verifyToken, authorize('Admin', 'Case Officer'), createItem)
router.patch('/:id', verifyToken, authorize('Admin', 'Case Officer'), updateItem)
router.delete('/:id', verifyToken, authorize('Admin'), deleteItem)

module.exports = router
