const express = require('express')
const router = express.Router()
const { getItems, createItem, updateItem, getMyApplications } = require('../controllers/volunteer_applications.controller')
const { verifyToken } = require('../middleware/auth.middleware')

router.get('/my_applications', verifyToken, getMyApplications)
router.get('/:id', verifyToken, getItems)
router.get('/', getItems)
router.post('/submit', verifyToken, createItem) // ← same pattern as case_reports
router.put('/:id', verifyToken, updateItem)

module.exports = router