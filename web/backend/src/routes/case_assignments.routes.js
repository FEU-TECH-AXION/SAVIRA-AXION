const express = require('express');
const router = express.Router();
const { createAssignment, getCaseAssignments, getOfficerAssignments, bulkAssignOfficers } = require('../controllers/case_assignments.controller');
const { verifyToken } = require('../middleware/auth.middleware');

// POST — assign a case to an officer (admin only)
router.post('/', verifyToken, createAssignment);

// POST — bulk assign cases to officers
router.post('/bulk-assign', verifyToken, bulkAssignOfficers);

// GET — get assignment history for a specific case
router.get('/:caseId', verifyToken, getCaseAssignments);

// GET — get all cases assigned to a specific officer
router.get('/officer/:officerId', verifyToken, getOfficerAssignments);

module.exports = router;
