const express = require('express')
const router = express.Router()
const { getItems, createItem, loginUser } = require('../controllers/users.controller')

router.get('/', getItems)
router.post('/', createItem)
router.post('/login', loginUser)

module.exports = router