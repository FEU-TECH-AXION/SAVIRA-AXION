const express = require('express')
const router = express.Router()
const {
    getItems,
    createItem,
    updateItem,
    reorderItems,
    deleteItem,
} = require('../controllers/screening_questions.controller')
const { verifyToken } = require('../middleware/auth.middleware')

router.get('/', verifyToken, getItems)
router.post('/', verifyToken, createItem)
router.put('/reorder', verifyToken, reorderItems)
router.put('/:id', verifyToken, updateItem)
router.delete('/:id', verifyToken, deleteItem)

module.exports = router
