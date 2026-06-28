const express = require('express')
const router = express.Router()
const { getItems, createItem } = require('../controllers/staff.controller')
const { verifyToken } = require('../middleware/auth.middleware')
const authorize = require('../middleware/authorize.middleware')

// Routes are kept thin or short since all the logic is in the controller
router.get('/', verifyToken, authorize('Admin', 'Staff', 'Project Officer'), getItems)
router.post('/', verifyToken, authorize('Admin'), createItem)

module.exports = router
