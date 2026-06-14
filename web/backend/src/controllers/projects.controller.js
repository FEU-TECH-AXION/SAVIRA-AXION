const ProjectsModel = require('../models/projects.model')

const getItems = async (req, res) => {
  try {
    const filters = {
      status: req.query.status,
      search: req.query.search,
      start_date: req.query.start_date,
      end_date: req.query.end_date,
    }
    const data = await ProjectsModel.getAll(filters)
    res.json(data)
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
}

const getItem = async (req, res) => {
  try {
    const project = await ProjectsModel.getById(req.params.id)
    if (!project) return res.status(404).json({ error: 'Project not found.' })
    res.json(project)
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
}

const createItem = async (req, res) => {
  try {
    console.log('projects.create payload:', JSON.stringify(req.body))
    const item = await ProjectsModel.create(req.body)
    res.status(201).json(item)
  } catch (err) {
    console.error('projects.create error:', err)
    res.status(500).json({ error: err.message })
  }
}

const updateItem = async (req, res) => {
  try {
    const item = await ProjectsModel.updateById(req.params.id, req.body)
    res.json(item)
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
}

const deleteItem = async (req, res) => {
  try {
    await ProjectsModel.deleteById(req.params.id)
    res.json({ deleted: true })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
}

const deleteMany = async (req, res) => {
  try {
    const { ids } = req.body
    if (!Array.isArray(ids)) {
      return res.status(400).json({ error: 'ids must be an array.' })
    }
    const data = await ProjectsModel.deleteMany(ids)
    res.json({ deleted: data.length })
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
  deleteMany,
}
