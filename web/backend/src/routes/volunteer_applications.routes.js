const express = require('express')
const router = express.Router()
const supabase = require('../config/supabase') // adjust path
const { getItems, getItem, createItem, updateItem, getMyApplications, getScores, assignAssessors, getRankings, withdrawApplication, undoWithdrawApplication } = require('../controllers/volunteer_applications.controller')
const { verifyToken } = require('../middleware/auth.middleware')
const authorize = require('../middleware/authorize.middleware')
const requireCommittee = require('../middleware/requireCommittee.middleware')
const requireVolunteerApplicationAccess = require('../middleware/requireVolunteerApplicationAccess.middleware')
const {
  resolveVolunteerApplicationBodyArray,
  resolveVolunteerApplicationParam,
} = require('../utils/volunteerApplicationPublicIds')
const { getAnalysis, retryAnalysis } = require('../controllers/volunteer_application_analysis.controller');
const { getEssayEvaluation, saveEssayEvaluation, getInterviewEvaluation, saveInterviewEvaluation } = require('../controllers/volunteer_application_evaluations.controller')
const { resolveActors, withActor } = require('../utils/actor')
const requireMembershipCommittee = requireCommittee(2)

router.get('/my_applications',          verifyToken, getMyApplications)
router.post('/submit',                  verifyToken, createItem)          
router.get('/rankings/list',            verifyToken, requireMembershipCommittee, getRankings)
router.post('/assignments',             verifyToken, authorize('Admin'), resolveVolunteerApplicationBodyArray('application_ids'), resolveVolunteerApplicationBodyArray('applicationIds'), assignAssessors)
router.get('/:id/essay_evaluation',     verifyToken, resolveVolunteerApplicationParam('id'), requireVolunteerApplicationAccess, getEssayEvaluation)
router.put('/:id/essay_evaluation',     verifyToken, resolveVolunteerApplicationParam('id'), requireMembershipCommittee, requireVolunteerApplicationAccess, saveEssayEvaluation)
router.get('/:id/interview_evaluation', verifyToken, resolveVolunteerApplicationParam('id'), requireVolunteerApplicationAccess, getInterviewEvaluation)
router.put('/:id/interview_evaluation', verifyToken, resolveVolunteerApplicationParam('id'), requireMembershipCommittee, requireVolunteerApplicationAccess, saveInterviewEvaluation)
router.get('/:id/scores',               verifyToken, resolveVolunteerApplicationParam('id'), requireVolunteerApplicationAccess, getScores)
router.get('/:id/nlp',                  verifyToken, resolveVolunteerApplicationParam('id'), requireVolunteerApplicationAccess, getAnalysis)
router.post('/:id/nlp/retry',           verifyToken, resolveVolunteerApplicationParam('id'), requireMembershipCommittee, requireVolunteerApplicationAccess, retryAnalysis)
router.post('/:id/withdraw',            verifyToken, resolveVolunteerApplicationParam('id'), requireVolunteerApplicationAccess, withdrawApplication)
router.post('/:id/undo_withdraw',       verifyToken, resolveVolunteerApplicationParam('id'), requireVolunteerApplicationAccess, undoWithdrawApplication)
router.get('/:id/status-history', verifyToken, resolveVolunteerApplicationParam('id'), requireVolunteerApplicationAccess, async (req, res) => {
  const { id } = req.params;

  const { data, error } = await supabase
    .from('volunteer_application_status_history')
    .select('history_id, status, notes, changed_by, created_at')
    .eq('volunteer_application_id', id)
    .order('created_at', { ascending: true });

  if (error) return res.status(500).json({ error: error.message });

  const actorsById = await resolveActors((data || []).map(h => h.changed_by).filter(Boolean));

  const formatted = (data || []).map(h => ({
    ...withActor(h, actorsById[h.changed_by], {
      idField: 'changed_by',
      nameField: 'changed_by_name',
      roleField: 'changed_by_role',
      fallbackName: 'System',
    }),
  }));

  return res.json({ data: formatted });
});
router.get('/:id',                      verifyToken, resolveVolunteerApplicationParam('id'), requireVolunteerApplicationAccess, getItem)
router.put('/:id',                      verifyToken, resolveVolunteerApplicationParam('id'), requireMembershipCommittee, requireVolunteerApplicationAccess, updateItem)
router.get('/',                         verifyToken, requireMembershipCommittee, getItems)

module.exports = router
