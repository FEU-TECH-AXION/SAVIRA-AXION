const AvailabilityModel = require('../models/availability.model')

const STATUSES = ['Available', 'Busy', 'On Leave', 'Out of Office']

const getItems = async (req, res) => {
  try {
    const data = await AvailabilityModel.getAll()
    res.json({ data })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
}

const updateItem = async (req, res) => {
  try {
    const isAdmin = Number(req.user?.role_id) === 3
    const isSelf = String(req.user?.id) === String(req.params.userId)
    if (!isAdmin && !isSelf) {
      return res.status(403).json({ error: 'You can only update your own availability.' })
    }
    if (req.body.availability_status && !STATUSES.includes(req.body.availability_status)) {
      return res.status(400).json({ error: 'Invalid availability status.' })
    }
    const data = await AvailabilityModel.update(req.params.userId, req.body)
    res.json({ data })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
}

module.exports = { getItems, updateItem }
