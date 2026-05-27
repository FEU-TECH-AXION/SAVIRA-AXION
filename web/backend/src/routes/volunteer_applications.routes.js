const express = require('express')
const router = express.Router()
const { getItems, getItem, createItem, updateItem, getMyApplications } = require('../controllers/volunteer_applications.controller')
const { verifyToken } = require('../middleware/auth.middleware')

router.get('/my_applications', verifyToken, getMyApplications)
router.get('/', getItems)
router.get('/:id', verifyToken, getItem)
router.post('/submit', verifyToken, createItem) // ← same pattern as case_reports
router.put('/:id', verifyToken, updateItem)

module.exports = router