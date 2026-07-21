const express = require('express')
const router = express.Router()
const { getItems, createItem } = require('../controllers/volunteer_application_evaluations.controller')
const { verifyToken } = require('../middleware/auth.middleware')
const requireCommittee = require('../middleware/requireCommittee.middleware')
const { resolveVolunteerApplicationBody } = require('../utils/volunteerApplicationPublicIds')
const requireMembershipCommittee = requireCommittee(2)

// Routes are kept thin or short since all the logic is in the controller
router.get('/', verifyToken, requireMembershipCommittee, getItems)
router.post('/', verifyToken, requireMembershipCommittee, resolveVolunteerApplicationBody('volunteer_application_id'), createItem)

module.exports = router
