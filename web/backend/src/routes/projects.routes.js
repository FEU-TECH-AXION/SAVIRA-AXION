const express = require('express')
const router = express.Router()
const {
  getItems,
  getItem,
  createItem,
  updateItem,
  deleteItem,
  deleteMany,
} = require('../controllers/projects.controller')

router.get('/', getItems)
router.get('/:id', getItem)
router.post('/', createItem)
router.patch('/:id', updateItem)
router.delete('/:id', deleteItem)
router.post('/bulk-delete', deleteMany)

module.exports = router
