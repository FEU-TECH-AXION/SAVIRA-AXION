const express = require('express')
const router = express.Router()
const { getItems, createItem, submitReport, getUserReports, getAllCases, getCaseById, getNLPAnalysis, getHeatmapData, getHeatmapMeta, updateItem } = require('../controllers/case_reports.controller')
// const { verifyToken } = require('../middleware/auth.middleware')

// !! IMPORTANT: specific routes must come BEFORE /:id or Express will swallow them
router.get('/heatmap/meta', getHeatmapMeta);   // no auth — static lookup data
router.get('/heatmap/data', // verifyToken, 
getHeatmapData);
router.get('/all',        // verifyToken, 
getAllCases);
router.get('/my-reports', // verifyToken, 
getUserReports);
router.post('/submit',    // verifyToken, 
submitReport);

router.get('/:id/nlp', // verifyToken, 
getNLPAnalysis);  // ← moved up
router.get('/:id',     // verifyToken, 
getCaseById);
router.get('/',        // verifyToken, 
getItems);
router.post('/',       // verifyToken, 
createItem);
router.patch('/:id', // verifyToken, 
updateItem)

module.exports = router