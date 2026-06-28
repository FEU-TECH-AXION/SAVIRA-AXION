const express = require('express');
const router = express.Router();
const { createAssignment, getCaseAssignments, getOfficerAssignments, bulkAssignOfficers, removeAssignment } = require('../controllers/case_assignments.controller');
const { verifyToken } = require('../middleware/auth.middleware');
const authorize = require('../middleware/authorize.middleware');

// POST — assign a case to an officer (admin only)
router.post('/', verifyToken, authorize('Admin'), createAssignment);

// POST — bulk assign cases to officers
router.post('/bulk-assign', verifyToken, authorize('Admin'), bulkAssignOfficers);
router.delete('/:caseReportId/:caseOfficerId', verifyToken, authorize('Admin'), removeAssignment);

// GET — get all cases assigned to a specific officer
router.get('/officer/:officerId', verifyToken, authorize('Admin', 'Case Officer'), getOfficerAssignments);

// GET — get assignment history for a specific case
router.get('/:caseId', verifyToken, authorize('Admin', 'Case Officer', 'Legal Personnel'), getCaseAssignments);

module.exports = router;
