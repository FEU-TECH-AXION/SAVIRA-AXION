const express = require('express')
const router = express.Router()
const {
    getItems,
    createItem,
    restoreItem,
    renameItem,
    copyItem,
} = require('../controllers/screening_question_set.controller')
const { verifyToken } = require('../middleware/auth.middleware')

router.get('/', verifyToken, getItems)
router.post('/', verifyToken, createItem)
router.post('/:id/restore', verifyToken, restoreItem)
router.post('/:id/copy', verifyToken, copyItem)
router.put('/:id/name', verifyToken, renameItem)

module.exports = router
