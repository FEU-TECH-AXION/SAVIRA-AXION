const router = require('express').Router()
const controller = require('../controllers/project_tasks.controller')
const { verifyToken } = require('../middleware/auth.middleware')
const authorize = require('../middleware/authorize.middleware')

router.use(verifyToken)
router.get('/', authorize('Admin', 'Staff'), controller.listAll)
router.get('/project/:projectId', authorize('Admin', 'Staff'), controller.list)
router.post('/project/:projectId', authorize('Admin'), controller.create)
router.get('/:taskId/activity', authorize('Admin', 'Staff'), controller.activity)
router.patch('/:taskId', authorize('Admin'), controller.update)
router.delete('/:taskId', authorize('Admin'), controller.cancel)

module.exports = router
