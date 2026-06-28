const express = require('express')
const router = express.Router()
const { getItems, getAssignmentsByApplication, bulkAssignApplication, removeAssignment } = require('../controllers/volunteer_application_assignments.controller')
const { verifyToken } = require('../middleware/auth.middleware')
const requireCommittee = require('../middleware/requireCommittee.middleware')
const requireMembershipCommittee = requireCommittee(2)

router.get('/',                 verifyToken, requireMembershipCommittee, getItems)
router.post('/assign-bulk',     verifyToken, requireMembershipCommittee, bulkAssignApplication)
router.delete('/:applicationId/:assessorId', verifyToken, requireMembershipCommittee, removeAssignment)
router.get('/:applicationId',    verifyToken, requireMembershipCommittee, getAssignmentsByApplication)

module.exports = router
