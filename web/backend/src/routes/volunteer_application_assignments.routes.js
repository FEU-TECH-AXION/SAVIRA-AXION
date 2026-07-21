const express = require('express')
const router = express.Router()
const { getItems, getAssignmentsByApplication, bulkAssignApplication, removeAssignment } = require('../controllers/volunteer_application_assignments.controller')
const { verifyToken } = require('../middleware/auth.middleware')
const authorize = require('../middleware/authorize.middleware')
const requireCommittee = require('../middleware/requireCommittee.middleware')
const requireVolunteerApplicationAccess = require('../middleware/requireVolunteerApplicationAccess.middleware')
const {
  resolveVolunteerApplicationBodyArray,
  resolveVolunteerApplicationParam,
} = require('../utils/volunteerApplicationPublicIds')
const requireMembershipCommittee = requireCommittee(2)

router.get('/',                 verifyToken, requireMembershipCommittee, getItems)
router.post('/assign-bulk',     verifyToken, authorize('Admin'), resolveVolunteerApplicationBodyArray('application_ids'), bulkAssignApplication)
router.delete('/:applicationId/:assessorId', verifyToken, requireMembershipCommittee, resolveVolunteerApplicationParam('applicationId'), removeAssignment)
router.get('/:applicationId',    verifyToken, requireMembershipCommittee, resolveVolunteerApplicationParam('applicationId'), requireVolunteerApplicationAccess, getAssignmentsByApplication)

module.exports = router
