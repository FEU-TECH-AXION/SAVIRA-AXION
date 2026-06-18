const express = require('express')
const router = express.Router()
const { getItems, createItem, submitReport, getUserReports, getAllCases, getCaseById, getNLPAnalysis, getHeatmapData, getHeatmapMeta, updateItem, withdrawCase, undoWithdrawCase } = require('../controllers/case_reports.controller')
const { verifyToken } = require('../middleware/auth.middleware')

// !! IMPORTANT: specific routes must come BEFORE /:id or Express will swallow them
router.get('/heatmap/meta', getHeatmapMeta);   // no auth — static lookup data
router.get('/heatmap/data', getHeatmapData);
router.get('/all',        verifyToken, getAllCases);
router.get('/my-reports', verifyToken, getUserReports);
router.post('/submit',    verifyToken, submitReport);

router.post('/:id/withdraw', verifyToken, withdrawCase);
router.post('/:id/undo_withdraw', verifyToken, undoWithdrawCase);
router.get('/:id/nlp', verifyToken, getNLPAnalysis);  // ← moved up
router.get('/:id',     getCaseById);
router.get('/',        getItems);
router.post('/',       createItem);
router.patch('/:id', updateItem)

module.exports = router