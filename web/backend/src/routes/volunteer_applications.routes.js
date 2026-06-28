const express = require('express')
const router = express.Router()
const supabase = require('../config/supabase') // adjust path
const { getItems, getItem, createItem, updateItem, getMyApplications, getScores, assignAssessors, getRankings, withdrawApplication, undoWithdrawApplication } = require('../controllers/volunteer_applications.controller')
const { verifyToken } = require('../middleware/auth.middleware')
const requireCommittee = require('../middleware/requireCommittee.middleware')
const requireVolunteerApplicationAccess = require('../middleware/requireVolunteerApplicationAccess.middleware')
const { getAnalysis } = require('../controllers/volunteer_application_analysis.controller');
const { getEssayEvaluation, saveEssayEvaluation, getInterviewEvaluation, saveInterviewEvaluation } = require('../controllers/volunteer_application_evaluations.controller')
const requireMembershipCommittee = requireCommittee(2)

router.get('/my_applications',          verifyToken, getMyApplications)
router.post('/submit',                  verifyToken, createItem)          
router.get('/rankings/list',            verifyToken, requireMembershipCommittee, getRankings)
router.post('/assignments',             verifyToken, requireMembershipCommittee, assignAssessors)
router.get('/:id/essay_evaluation',     verifyToken, requireVolunteerApplicationAccess, getEssayEvaluation)
router.put('/:id/essay_evaluation',     verifyToken, requireMembershipCommittee, saveEssayEvaluation)
router.get('/:id/interview_evaluation', verifyToken, requireVolunteerApplicationAccess, getInterviewEvaluation)
router.put('/:id/interview_evaluation', verifyToken, requireMembershipCommittee, saveInterviewEvaluation)
router.get('/:id/scores',               verifyToken, requireVolunteerApplicationAccess, getScores)
router.get('/:id/nlp',                  verifyToken, requireVolunteerApplicationAccess, getAnalysis)
router.post('/:id/withdraw',            verifyToken, requireVolunteerApplicationAccess, withdrawApplication)
router.post('/:id/undo_withdraw',       verifyToken, requireVolunteerApplicationAccess, undoWithdrawApplication)
router.get('/:id/status-history', verifyToken, requireVolunteerApplicationAccess, async (req, res) => {
  const { id } = req.params;

  const { data, error } = await supabase
    .from('volunteer_application_status_history')
    .select('history_id, status, notes, changed_by, created_at')
    .eq('volunteer_application_id', id)
    .order('created_at', { ascending: true });

  if (error) return res.status(500).json({ error: error.message });

  // Collect unique user IDs
  const userIds = [...new Set(
    (data || []).map(h => h.changed_by).filter(Boolean)
  )];

  // Fetch names in one query
  const { data: users } = userIds.length
    ? await supabase
        .from('users')
        .select('user_id, first_name, last_name')
        .in('user_id', userIds.map(Number))
    : { data: [] };

  const userMap = Object.fromEntries(
    (users || []).map(u => [String(u.user_id), `${u.first_name} ${u.last_name}`.trim()])
  );

  const formatted = (data || []).map(h => ({
    ...h,
    changed_by_name: userMap[h.changed_by] || 'System',
  }));

  return res.json({ data: formatted });
});
router.get('/:id',                      verifyToken, requireVolunteerApplicationAccess, getItem)
router.put('/:id',                      verifyToken, requireMembershipCommittee, updateItem)
router.get('/',                         verifyToken, requireMembershipCommittee, getItems)

module.exports = router
