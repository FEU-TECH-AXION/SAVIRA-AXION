const express = require('express')
const router = express.Router()
const {
  getItems,
  getItem,
  createItem,
  updateItem,
  deleteItem,
} = require('../controllers/chapters.controller')
const { verifyToken } = require('../middleware/auth.middleware')
const authorize = require('../middleware/authorize.middleware')

router.get('/', getItems)
router.get('/:id', getItem)
router.post('/', verifyToken, authorize('Admin'), createItem)
router.put('/:id', verifyToken, authorize('Admin'), updateItem)
router.patch('/:id', verifyToken, authorize('Admin'), updateItem)
router.delete('/:id', verifyToken, authorize('Admin'), deleteItem)

module.exports = router
