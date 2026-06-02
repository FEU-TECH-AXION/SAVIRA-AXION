const express = require('express')
const router = express.Router()
const { getItems, createItem, createBulk, deleteItem } = require('../controllers/interview_slots.controller')

router.get('/',         getItems)
router.post('/',        createItem)
router.post('/bulk',    createBulk)
router.delete('/:id',   deleteItem)

module.exports = router