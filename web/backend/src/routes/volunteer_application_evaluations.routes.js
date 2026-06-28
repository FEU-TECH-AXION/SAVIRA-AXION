const express = require('express')
const router = express.Router()
const { getItems, createItem } = require('../controllers/volunteer_application_evaluations.controller')
const { verifyToken } = require('../middleware/auth.middleware')
const requireCommittee = require('../middleware/requireCommittee.middleware')
const requireMembershipCommittee = requireCommittee(2)

// Routes are kept thin or short since all the logic is in the controller
router.get('/', verifyToken, requireMembershipCommittee, getItems)
router.post('/', verifyToken, requireMembershipCommittee, createItem)

module.exports = router
