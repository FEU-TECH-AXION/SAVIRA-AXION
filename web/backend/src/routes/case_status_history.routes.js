const express = require('express')
const router = express.Router()
const { getItems, createItem } = require('../controllers/case_status_history.controller')

// Routes are kept thin or short since all the logic is in the controller
router.get('/', getItems)
router.post('/', createItem)

module.exports = router