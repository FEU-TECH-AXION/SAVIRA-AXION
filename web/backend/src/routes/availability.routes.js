const express = require('express')
const { getItems, getItem, updateItem } = require('../controllers/availability.controller')
const { verifyToken } = require('../middleware/auth.middleware')

const router = express.Router()

router.get('/', verifyToken, getItems)
router.get('/:userId', verifyToken, getItem)
router.patch('/:userId', verifyToken, updateItem)

module.exports = router
