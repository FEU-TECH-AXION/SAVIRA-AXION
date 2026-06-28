const express = require('express')
const router = express.Router()
const { getItems, createItem } = require('../controllers/user_case_logs.controller')
const { verifyToken } = require('../middleware/auth.middleware')
const authorize = require('../middleware/authorize.middleware')

// Routes are kept thin or short since all the logic is in the controller
router.get('/', verifyToken, authorize('Admin', 'Case Officer', 'Legal Personnel'), getItems)
router.post('/', verifyToken, authorize('Admin', 'Case Officer'), createItem)

module.exports = router
