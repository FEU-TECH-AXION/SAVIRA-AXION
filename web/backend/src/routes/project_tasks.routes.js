const router = require('express').Router()
const controller = require('../controllers/project_tasks.controller')
const { verifyToken } = require('../middleware/auth.middleware')

router.use(verifyToken)
router.get('/', controller.listAll)
router.get('/project/:projectId', controller.list)
router.post('/project/:projectId', controller.create)
router.get('/:taskId/activity', controller.activity)
router.patch('/:taskId', controller.update)
router.delete('/:taskId', controller.cancel)

module.exports = router
