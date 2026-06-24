const ChaptersModel = require('../models/chapters.model')

const getItems = async (req, res) => {
  try {
    const data = await ChaptersModel.getAll()
    res.json(data)
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
}

const getItem = async (req, res) => {
  try {
    const item = await ChaptersModel.getById(req.params.id)
    if (!item) return res.status(404).json({ error: 'Chapter not found.' })
    res.json(item)
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
}

const createItem = async (req, res) => {
  try {
    const item = await ChaptersModel.create(req.body)
    res.status(201).json(item)
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
}

const updateItem = async (req, res) => {
  try {
    const item = await ChaptersModel.update(req.params.id, req.body)
    if (!item) return res.status(404).json({ error: 'Chapter not found.' })
    res.json(item)
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
}

const deleteItem = async (req, res) => {
  try {
    const item = await ChaptersModel.deleteById(req.params.id)
    if (!item) return res.status(404).json({ error: 'Chapter not found.' })
    res.json({ deleted: item })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
}

module.exports = {
  getItems,
  getItem,
  createItem,
  updateItem,
  deleteItem,
}
