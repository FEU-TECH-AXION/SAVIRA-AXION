const express = require('express')
const router = express.Router()
const { getItems, createItem, submitReport, getUserReports, getAllCases, getCaseById, getNLPAnalysis, getHeatmapData, getHeatmapMeta, updateItem, withdrawCase, undoWithdrawCase } = require('../controllers/case_reports.controller')
const { verifyToken } = require('../middleware/auth.middleware')
const { amendCaseFields, createFollowUp, listFollowUps } = require('../controllers/follow_ups.controller')
const multer = require('multer');
const upload = multer({ storage: multer.memoryStorage() });
const withdrawalUpload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 },
});

// !! IMPORTANT: specific routes must come BEFORE /:id or Express will swallow them
router.get('/heatmap/meta', getHeatmapMeta);   // no auth — static lookup data
router.get('/heatmap/data', getHeatmapData);
router.get('/all',        verifyToken, getAllCases);
router.get('/my-reports', verifyToken, getUserReports);
router.post('/submit', verifyToken, upload.array('files', 10), submitReport);

router.get('/:id/follow-ups', verifyToken, listFollowUps);
router.post('/:id/follow-ups', verifyToken, upload.single('file'), createFollowUp);
router.patch('/:id/fields', verifyToken, upload.single('file'), amendCaseFields);
router.post('/:id/withdraw', verifyToken, withdrawalUpload.single('affidavit'), withdrawCase);
router.post('/:id/undo_withdraw', verifyToken, undoWithdrawCase);
router.get('/:id/nlp', verifyToken, getNLPAnalysis); 
router.get('/:id',     getCaseById);
router.get('/',        getItems);
router.post('/',       createItem);
router.patch('/:id', updateItem)

module.exports = router
