const express = require('express')
const router = express.Router()
const { getItems, getItem, createItem, updateItem, getMyApplications } = require('../controllers/volunteer_applications.controller')
const { verifyToken } = require('../middleware/auth.middleware')
const { getAnalysis } = require('../controllers/volunteer_application_analysis.controller');
const { getEssayEvaluation, saveEssayEvaluation, getInterviewEvaluation, saveInterviewEvaluation } = require('../controllers/volunteer_application_evaluations.controller')

router.get('/my_applications',          verifyToken, getMyApplications)
router.post('/submit',                  verifyToken, createItem)          
router.get('/:id/essay_evaluation',     verifyToken, getEssayEvaluation)
router.put('/:id/essay_evaluation',     verifyToken, saveEssayEvaluation)
router.get('/:id/interview_evaluation', verifyToken, getInterviewEvaluation)
router.put('/:id/interview_evaluation', verifyToken, saveInterviewEvaluation)
router.get('/:id/nlp',                  verifyToken, getAnalysis)
router.get('/:id',                      verifyToken, getItem)
router.put('/:id',                      verifyToken, updateItem)
router.get('/',                         getItems)

module.exports = router