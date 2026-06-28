const express = require('express')
const router = express.Router()
const multer = require('multer')
const upload = multer()
const { verifyToken } = require('../middleware/auth.middleware')
const authorize = require('../middleware/authorize.middleware')
const requireProjectManager = require('../middleware/requireProjectManager.middleware')
const {
  getItems,
  getItem,
  createItem,
  updateItem,
  deleteItem,
  deleteMany,
} = require('../controllers/projects.controller')

router.get('/', getItems)
router.post('/upload-image', verifyToken, authorize('Admin', 'Staff', 'Project Officer'), upload.single('image'), require('../controllers/projects.controller').uploadImage)
router.post('/bulk-delete', verifyToken, authorize('Admin'), deleteMany)
router.get('/:id', getItem)
router.post('/', verifyToken, authorize('Admin', 'Project Officer'), createItem)
router.patch('/:id', verifyToken, requireProjectManager('project'), updateItem)
router.delete('/:id', verifyToken, authorize('Admin'), deleteItem)

module.exports = router
