const express = require('express')
const router = express.Router()
const { getItems, createItem } = require('../controllers/volunteer_applications.controller')
const { verifyToken } = require('../middleware/auth.middleware')

router.get('/', getItems)
router.post('/submit', verifyToken, createItem) // ← same pattern as case_reports

module.exports = router