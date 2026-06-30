const express = require('express')
const router = express.Router()
const {
    getItems,
    getItem,
    createItem,
    selectSlot,
    reschedule,
    acceptReschedule,
    requestNewSlots,
    reopenSelection,
    confirm,
    complete,
    cancel,
    unassignStaff,
    reject,
    expireStale,
} = require('../controllers/interviews.controller')
const { verifyToken } = require('../middleware/auth.middleware')
const requireCommittee = require('../middleware/requireCommittee.middleware')
const requireMembershipCommittee = requireCommittee(2)

router.get('/',              verifyToken, getItems)
router.post('/expire',       verifyToken, requireMembershipCommittee, expireStale)
router.get('/:id',           verifyToken, getItem)
router.post('/',             verifyToken, createItem)
router.patch('/:id/select-slot', verifyToken, selectSlot)
router.patch('/:id/reschedule',  verifyToken, reschedule)
router.patch('/:id/accept-reschedule', verifyToken, acceptReschedule)
router.patch('/:id/request-new-slots', verifyToken, requestNewSlots)
router.patch('/:id/reopen-selection', verifyToken, reopenSelection)
router.patch('/:id/confirm',     verifyToken, confirm)
router.patch('/:id/complete',    verifyToken, complete)
router.patch('/:id/cancel',      verifyToken, cancel)
router.patch('/:id/unassign-staff', verifyToken, requireMembershipCommittee, unassignStaff)
router.patch('/:id/reject',      verifyToken, reject)

module.exports = router
