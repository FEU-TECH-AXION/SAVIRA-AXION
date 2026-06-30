const express = require('express')
const router = express.Router()
const { getItems, createItem, updateItem, createBulk, deleteItem } = require('../controllers/interview_slots.controller')
const { verifyToken } = require('../middleware/auth.middleware')
const requireCommittee = require('../middleware/requireCommittee.middleware')
const { supabaseAdmin } = require('../config/supabase')
const requireMembershipCommittee = requireCommittee(2)

const normalizeSlotType = (slotType) => {
  if (slotType === 'volunteer_application') return 'volunteer'
  return slotType
}

const getUserId = (user = {}) => user.user_id || user.id || user.sub

const requireCaseSlotManager = (req, res, next) => {
  if (!req.user) return res.status(401).json({ error: 'Unauthorized' })
  if (req.user.role === 'Admin') return next()
  if (req.user.role === 'Case Officer') {
    const userId = getUserId(req.user)
    if (req.method === 'GET') req.query.created_by = userId
    else req.body.created_by = userId
    return next()
  }
  return res.status(403).json({ error: 'Forbidden' })
}

const requireSlotTypeAccess = (req, res, next) => {
  const slotType = normalizeSlotType(req.query.slot_type || req.body.slot_type)

  if (slotType === 'case_report') return requireCaseSlotManager(req, res, next)
  if (slotType === 'volunteer') return requireMembershipCommittee(req, res, next)
  if (req.user?.role === 'Admin') return next()

  return res.status(400).json({ error: 'slot_type must be case_report or volunteer.' })
}

const requireExistingSlotAccess = async (req, res, next) => {
  try {
    if (!req.user) return res.status(401).json({ error: 'Unauthorized' })

    const { data: slot, error } = await supabaseAdmin
      .from('interview_slots')
      .select('slot_type, created_by')
      .eq('slot_id', req.params.id)
      .maybeSingle()

    if (error) throw error
    if (!slot) return res.status(404).json({ error: 'Slot not found.' })

    req.interviewSlot = slot

    if (slot.slot_type === 'case_report') {
      if (req.user.role === 'Admin') return next()
      if (req.user.role === 'Case Officer' && String(slot.created_by) === String(getUserId(req.user))) {
        return next()
      }
      return res.status(403).json({ error: 'Forbidden' })
    }

    if (slot.slot_type === 'volunteer') return requireMembershipCommittee(req, res, next)

    return res.status(400).json({ error: 'Unsupported slot type.' })
  } catch (err) {
    return res.status(500).json({ error: err.message })
  }
}

router.get('/',         verifyToken, requireSlotTypeAccess, getItems)
router.post('/',        verifyToken, requireSlotTypeAccess, createItem)
router.post('/bulk',    verifyToken, requireSlotTypeAccess, createBulk)
router.patch('/:id',    verifyToken, requireExistingSlotAccess, updateItem)
router.delete('/:id',   verifyToken, requireExistingSlotAccess, deleteItem)

module.exports = router
