const express = require('express')
const router = express.Router()
const { getItems, createItem, updateItem, createBulk, deleteItem } = require('../controllers/interview_slots.controller')
const { verifyToken } = require('../middleware/auth.middleware')
const requireCommittee = require('../middleware/requireCommittee.middleware')
const requireMembershipCommittee = requireCommittee(2)

router.get('/',         verifyToken, requireMembershipCommittee, getItems)
router.post('/',        verifyToken, requireMembershipCommittee, createItem)
router.post('/bulk',    verifyToken, requireMembershipCommittee, createBulk)
router.patch('/:id',    verifyToken, requireMembershipCommittee, updateItem)
router.delete('/:id',   verifyToken, requireMembershipCommittee, deleteItem)

module.exports = router
