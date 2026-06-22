const express = require('express')
const router = express.Router()
const {
    getItems,
    getItem,
    createItem,
    selectSlot,
    reschedule,
    requestNewSlots,
    confirm,
    complete,
    cancel,
    reject,
    expireStale,
} = require('../controllers/interviews.controller')

router.get('/',              getItems)
router.get('/:id',           getItem)
router.post('/',             createItem)
router.patch('/:id/select-slot', selectSlot)
router.patch('/:id/reschedule',  reschedule)
router.patch('/:id/request-new-slots', requestNewSlots)
router.patch('/:id/confirm',     confirm)
router.patch('/:id/complete',    complete)
router.patch('/:id/cancel',      cancel)
router.patch('/:id/reject',      reject)
router.post('/expire',           expireStale)

module.exports = router
