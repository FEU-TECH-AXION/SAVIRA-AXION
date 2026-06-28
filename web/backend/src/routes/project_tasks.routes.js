const router = require('express').Router()
const controller = require('../controllers/project_tasks.controller')
const { verifyToken } = require('../middleware/auth.middleware')
const authorize = require('../middleware/authorize.middleware')
const requireProjectManager = require('../middleware/requireProjectManager.middleware')

router.use(verifyToken)
router.get('/', authorize('Admin', 'Staff', 'Project Officer'), controller.listAll)
router.get('/project/:projectId', authorize('Admin', 'Staff', 'Project Officer'), controller.list)
router.post('/project/:projectId', requireProjectManager('project'), controller.create)
router.get('/:taskId/activity', authorize('Admin', 'Staff', 'Project Officer'), controller.activity)
router.patch('/:taskId', requireProjectManager('task'), controller.update)
router.delete('/:taskId', requireProjectManager('task'), controller.cancel)

module.exports = router
