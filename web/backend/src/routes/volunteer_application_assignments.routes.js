const express = require('express')
const router = express.Router()
const { getItems, getAssignmentsByApplication, bulkAssignApplication, removeAssignment } = require('../controllers/volunteer_application_assignments.controller')
const { verifyToken } = require('../middleware/auth.middleware')

router.get('/',                 verifyToken, getItems)
router.post('/assign-bulk',     verifyToken, bulkAssignApplication)
router.delete('/:applicationId/:assessorId', verifyToken, removeAssignment)
router.get('/:applicationId',    verifyToken, getAssignmentsByApplication)

module.exports = router
