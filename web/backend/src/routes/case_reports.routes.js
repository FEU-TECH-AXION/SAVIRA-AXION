const express = require('express')
const router = express.Router()
const { getItems, createItem, submitReport, getUserReports, getAllCases, getCaseById, getNLPAnalysis, getHeatmapData, getHeatmapMeta, updateItem, withdrawCase, undoWithdrawCase, dismissDuplicate } = require('../controllers/case_reports.controller')
const { verifyToken } = require('../middleware/auth.middleware')
const authorize = require('../middleware/authorize.middleware')
const requireCaseReportAccess = require('../middleware/requireCaseReportAccess.middleware')
const { amendCaseFields, createFollowUp, listFollowUps } = require('../controllers/follow_ups.controller')
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
router.get('/all',        verifyToken, requireCaseAccess, getAllCases);
router.get('/my-reports', verifyToken, getUserReports);
router.post('/submit', verifyToken, handleEvidenceUpload, submitReport);

router.get('/:id/follow-ups', verifyToken, listFollowUps);
router.post('/:id/follow-ups', verifyToken, upload.single('file'), createFollowUp);
router.patch('/:id/fields', verifyToken, upload.single('file'), amendCaseFields);
router.post('/:id/withdraw', verifyToken, withdrawalUpload.single('affidavit'), withdrawCase);
router.post('/:id/undo_withdraw', verifyToken, undoWithdrawCase);
router.patch('/:id/duplicates/:matchId/dismiss', verifyToken, dismissDuplicate);
router.get('/:id/nlp', verifyToken, requireCaseReportAccess, getNLPAnalysis); 
router.get('/:id',     verifyToken, requireCaseReportAccess, getCaseById);
router.get('/',        verifyToken, requireCaseAccess, getItems);
router.post('/',       verifyToken, authorize('Admin'), createItem);
router.patch('/:id', verifyToken, requireCaseAccess, updateItem)

module.exports = router
