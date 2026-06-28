const express = require('express')
const router = express.Router()
const { getItems, createItem, updateItem, reorderItems, deleteItem } = require('../controllers/screening_questions.controller')
const { verifyToken } = require('../middleware/auth.middleware')
const requireCommittee = require('../middleware/requireCommittee.middleware')
const requireMembershipCommittee = requireCommittee(2)

// ← Public: needed by the volunteer application form before login
router.get('/', getItems)

// Write routes remain protected
router.post('/', verifyToken, requireMembershipCommittee, createItem)
router.put('/reorder', verifyToken, requireMembershipCommittee, reorderItems)
router.put('/:id', verifyToken, requireMembershipCommittee, updateItem)
router.delete('/:id', verifyToken, requireMembershipCommittee, deleteItem)

module.exports = router
