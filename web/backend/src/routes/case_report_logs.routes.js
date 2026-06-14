const express = require('express')
const router = express.Router()
const { getItems, getItemsByCase, createItem, updateItem, deleteItem } = require('../controllers/case_report_logs.controller')

// Routes are kept thin or short since all the logic is in the controller
router.get('/case/:caseReportId', getItemsByCase)
router.get('/', getItems)
router.post('/', createItem)
router.patch('/:id', updateItem)
router.delete('/:id', deleteItem)

module.exports = router
