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
const requireCommittee = require('../middleware/requireCommittee.middleware')
const requireMembershipCommittee = requireCommittee(2)

router.get('/', verifyToken, requireMembershipCommittee, getItems)
router.post('/', verifyToken, requireMembershipCommittee, createItem)
router.post('/:id/restore', verifyToken, requireMembershipCommittee, restoreItem)
router.post('/:id/copy', verifyToken, requireMembershipCommittee, copyItem)
router.put('/:id/name', verifyToken, requireMembershipCommittee, renameItem)

module.exports = router
