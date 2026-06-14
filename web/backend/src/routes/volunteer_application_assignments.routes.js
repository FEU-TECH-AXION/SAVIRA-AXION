const express = require('express')
const router = express.Router()
const { getItems, getAssignmentsByApplication, bulkAssignApplication } = require('../controllers/volunteer_application_assignments.controller')
const { verifyToken } = require('../middleware/auth.middleware')

router.get('/',                 verifyToken, getItems)
router.post('/assign-bulk',     verifyToken, bulkAssignApplication)
router.get('/:applicationId',    getAssignmentsByApplication)

module.exports = router