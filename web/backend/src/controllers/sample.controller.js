// const ItemModel = require('../models/sample.model')

// const getItems = async (req, res) => {
//   try {
//     const data = await ItemModel.getAll()
//     res.json(data)
//   } catch (err) {
//     res.status(500).json({ error: err.message })
//   }
// }

// const createItem = async (req, res) => {
//   try {
//     const item = await ItemModel.create(req.body)
//     res.status(201).json(item)
//   } catch (err) {
//     res.status(500).json({ error: err.message })
//   }
// }

// module.exports = { getItems, createItem }