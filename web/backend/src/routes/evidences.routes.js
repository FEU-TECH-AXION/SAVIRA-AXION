const express = require('express')
const router = express.Router()
const { getItems, createItem } = require('../controllers/evidences.controller')
const { verifyToken } = require('../middleware/auth.middleware')
const authorize = require('../middleware/authorize.middleware')
const requireCaseReportAccess = require('../middleware/requireCaseReportAccess.middleware')

// Routes are kept thin or short since all the logic is in the controller
router.get('/', verifyToken, authorize('Admin'), getItems)
router.post('/', verifyToken, authorize('Admin', 'Case Officer'), requireCaseReportAccess, createItem)

module.exports = router
