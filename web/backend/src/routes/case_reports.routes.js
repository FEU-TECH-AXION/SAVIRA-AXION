const express = require('express')
const router = express.Router()
const { getItems, createItem, submitReport, getUserReports, getCaseStats, getAllCases, getCaseById, getCaseSummaryById, getNLPAnalysis, getHeatmapData, getHeatmapMeta, updateItem, withdrawCase, undoWithdrawCase, dismissDuplicate } = require('../controllers/case_reports.controller')
const { verifyToken } = require('../middleware/auth.middleware')
const authorize = require('../middleware/authorize.middleware')
const requireCaseReportAccess = require('../middleware/requireCaseReportAccess.middleware')
const { resolveCaseParam } = require('../utils/casePublicIds')
const { validateCaseReport } = require('../middleware/case_reports_validation.middleware')
const { amendCaseFields, createFollowUp, listFollowUps } = require('../controllers/follow_ups.controller')
const { getPublicUpdates } = require('../controllers/case_updates.controller')
const multer = require('multer');
const MAX_EVIDENCE_FILE_SIZE = 50 * 1024 * 1024;
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: MAX_EVIDENCE_FILE_SIZE, files: 10 },
});
const withdrawalUpload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 },
});
const requireCaseAccess = authorize('Admin', 'Case Officer', 'Legal Personnel')

function handleEvidenceUpload(req, res, next) {
  upload.array('files', 10)(req, res, (err) => {
    if (!err) return next();
    if (err instanceof multer.MulterError && err.code === 'LIMIT_FILE_SIZE') {
      return res.status(400).json({ error: 'Each evidence file must be 50 MB or smaller.' });
    }
    if (err instanceof multer.MulterError && err.code === 'LIMIT_FILE_COUNT') {
      return res.status(400).json({ error: 'You can upload up to 10 evidence files per report.' });
    }
    return res.status(400).json({ error: err.message || 'Invalid evidence upload.' });
  });
}

// !! IMPORTANT: specific routes must come BEFORE /:id or Express will swallow them
router.get('/heatmap/meta', getHeatmapMeta);   // no auth — static lookup data
router.get('/heatmap/data', getHeatmapData);
router.get('/stats',      verifyToken, requireCaseAccess, getCaseStats);
router.get('/all',        verifyToken, requireCaseAccess, getAllCases);
router.get('/my-reports', verifyToken, getUserReports);
router.post('/submit', verifyToken, handleEvidenceUpload, validateCaseReport, submitReport);

router.get('/:id/follow-ups', verifyToken, resolveCaseParam('id'), listFollowUps);
router.post('/:id/follow-ups', verifyToken, resolveCaseParam('id'), upload.single('file'), createFollowUp);
router.patch('/:id/fields', verifyToken, resolveCaseParam('id'), upload.single('file'), amendCaseFields);
router.post('/:id/withdraw', verifyToken, resolveCaseParam('id'), withdrawalUpload.single('affidavit'), withdrawCase);
router.post('/:id/undo_withdraw', verifyToken, resolveCaseParam('id'), undoWithdrawCase);
router.patch('/:id/duplicates/:matchId/dismiss', verifyToken, resolveCaseParam('id'), requireCaseAccess, requireCaseReportAccess, dismissDuplicate);
router.get('/:id/public-updates', verifyToken, resolveCaseParam('id'), requireCaseReportAccess, getPublicUpdates);
router.get('/:id/nlp', verifyToken, resolveCaseParam('id'), requireCaseReportAccess, getNLPAnalysis); 
router.get('/:id/summary', verifyToken, resolveCaseParam('id'), requireCaseReportAccess, getCaseSummaryById);
router.get('/:id',     verifyToken, resolveCaseParam('id'), requireCaseReportAccess, getCaseById);
router.get('/',        verifyToken, authorize('Admin'), getItems);
router.post('/',       verifyToken, authorize('Admin'), createItem);
router.patch('/:id', verifyToken, resolveCaseParam('id'), requireCaseAccess, requireCaseReportAccess, updateItem)

module.exports = router
