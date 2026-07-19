const assert = require('node:assert/strict')
const { describe, it, afterEach } = require('node:test')

const modelPath = require.resolve('../models/availability.model')
const notificationPath = require.resolve('../services/notificationService')
const controllerPath = require.resolve('./availability.controller')
const validAwayNote = 'Vacation: Back next week'

function loadController({
  previousStatus = 'Available',
  summary = { cases: 2, legal: 0, volunteer: 0, projects: 1, total: 3, name: 'Juan Dela Cruz' },
} = {}) {
  delete require.cache[modelPath]
  delete require.cache[notificationPath]
  delete require.cache[controllerPath]

  const calls = {
    notifyRoleUsers: [],
    fireAndForget: [],
    getActiveWorkSummary: [],
    getAvailabilityRecord: [],
  }

  require.cache[modelPath] = {
    id: modelPath,
    filename: modelPath,
    loaded: true,
    exports: {
      getAvailabilityStatus: async (userId) => {
        assert.equal(userId, 'user-1')
        return previousStatus
      },
      getAvailabilityRecord: async (userId) => {
        calls.getAvailabilityRecord.push(userId)
        return {
          user_id: userId,
          availability_status: previousStatus,
          availability_note: 'Vacation: Back next week',
        }
      },
      update: async (userId, payload) => {
        assert.equal(userId, 'user-1')
        return {
          user_id: userId,
          availability_status: payload.availability_status || previousStatus,
          availability_note: payload.availability_note || null,
        }
      },
      getActiveWorkSummary: async (userId) => {
        calls.getActiveWorkSummary.push(userId)
        return summary
      },
    },
  }

  require.cache[notificationPath] = {
    id: notificationPath,
    filename: notificationPath,
    loaded: true,
    exports: {
      notifyRoleUsers: (roles, notification) => {
        calls.notifyRoleUsers.push({ roles, notification })
        return Promise.resolve()
      },
      fireAndForget: (promise, label) => {
        calls.fireAndForget.push({ promise, label })
        promise.catch(() => {})
      },
    },
  }

  return { controller: require('./availability.controller'), calls }
}

async function callUpdate(controller, body) {
  const response = {
    statusCode: 200,
    payload: null,
    status(code) {
      this.statusCode = code
      return this
    },
    json(payload) {
      this.payload = payload
      return this
    },
  }

  await controller.updateItem({
    user: { id: 'admin-1', role_id: 3 },
    params: { userId: 'user-1' },
    body,
  }, response)

  return response
}

async function callGet(controller, { requester = { id: 'user-1', role_id: 2 }, userId = 'user-1' } = {}) {
  const response = {
    statusCode: 200,
    payload: null,
    status(code) {
      this.statusCode = code
      return this
    },
    json(payload) {
      this.payload = payload
      return this
    },
  }

  await controller.getItem({
    user: requester,
    params: { userId },
  }, response)

  return response
}

afterEach(() => {
  delete require.cache[modelPath]
  delete require.cache[notificationPath]
  delete require.cache[controllerPath]
})

describe('availability update reassignment notifications', () => {
  it('notifies admins when a user transitions into leave with active work', async () => {
    const { controller, calls } = loadController()

    const response = await callUpdate(controller, {
      availability_status: 'On Leave',
      availability_note: validAwayNote,
    })
    await calls.fireAndForget[0].promise

    assert.equal(response.statusCode, 200)
    assert.equal(calls.notifyRoleUsers.length, 1)
    assert.deepEqual(calls.notifyRoleUsers[0].roles, ['Admin'])
    assert.equal(calls.notifyRoleUsers[0].notification.title, 'Reassignment may be needed')
    assert.match(calls.notifyRoleUsers[0].notification.body, /Juan Dela Cruz is now On Leave/)
    assert.match(calls.notifyRoleUsers[0].notification.body, /2 cases/)
    assert.match(calls.notifyRoleUsers[0].notification.body, /1 project/)
    assert.doesNotMatch(calls.notifyRoleUsers[0].notification.body, /0 legal/)
    assert.deepEqual(calls.notifyRoleUsers[0].notification.data, {
      type: 'availability_reassignment',
      user_id: 'user-1',
      link: '/staffAvailability',
      priority: 'high',
    })
    assert.equal(calls.fireAndForget.length, 1)
    assert.equal(calls.fireAndForget[0].label, 'availability reassignment notice')
  })

  it('skips notifications when the user has no active work', async () => {
    const { controller, calls } = loadController({
      summary: { cases: 0, legal: 0, volunteer: 0, projects: 0, total: 0, name: 'Juan Dela Cruz' },
    })

    await callUpdate(controller, {
      availability_status: 'On Leave',
      availability_note: validAwayNote,
    })
    await calls.fireAndForget[0].promise

    assert.equal(calls.notifyRoleUsers.length, 0)
    assert.equal(calls.fireAndForget.length, 1)
    assert.deepEqual(calls.getActiveWorkSummary, ['user-1'])
  })

  it('skips notifications for a no-op unavailable status resave', async () => {
    const { controller, calls } = loadController({ previousStatus: 'On Leave' })

    await callUpdate(controller, {
      availability_status: 'On Leave',
      availability_note: validAwayNote,
    })

    assert.equal(calls.notifyRoleUsers.length, 0)
    assert.equal(calls.fireAndForget.length, 0)
    assert.deepEqual(calls.getActiveWorkSummary, [])
  })

  it('skips notifications when moving out of leave', async () => {
    const { controller, calls } = loadController({ previousStatus: 'On Leave' })

    await callUpdate(controller, { availability_status: 'Available' })

    assert.equal(calls.notifyRoleUsers.length, 0)
    assert.equal(calls.fireAndForget.length, 0)
    assert.deepEqual(calls.getActiveWorkSummary, [])
  })

  it('skips notifications for note-only updates', async () => {
    const { controller, calls } = loadController()

    await callUpdate(controller, { availability_note: 'Back next week' })

    assert.equal(calls.notifyRoleUsers.length, 0)
    assert.equal(calls.fireAndForget.length, 0)
    assert.deepEqual(calls.getActiveWorkSummary, [])
  })

  it('accepts leave updates with a schema-backed note', async () => {
    const { controller } = loadController()

    const response = await callUpdate(controller, {
      availability_status: 'On Leave',
      availability_note: 'Other: Back next week',
    })

    assert.equal(response.statusCode, 200)
    assert.equal(response.payload.data.availability_note, 'Other: Back next week')
  })

  it('requires a valid reason for leave and out of office updates', async () => {
    const { controller, calls } = loadController()

    const response = await callUpdate(controller, {
      availability_status: 'Out of Office',
      availability_note: 'Back next week',
    })

    assert.equal(response.statusCode, 400)
    assert.match(response.payload.error, /valid reason/i)
    assert.equal(calls.fireAndForget.length, 0)
  })

  it('requires details for leave and out of office updates', async () => {
    const { controller, calls } = loadController()

    const response = await callUpdate(controller, {
      availability_status: 'On Leave',
      availability_note: 'Vacation',
    })

    assert.equal(response.statusCode, 400)
    assert.match(response.payload.error, /details/i)
    assert.equal(calls.fireAndForget.length, 0)
  })
})

describe('availability self-read permissions', () => {
  it('allows a user to read their own availability', async () => {
    const { controller, calls } = loadController()

    const response = await callGet(controller)

    assert.equal(response.statusCode, 200)
    assert.equal(response.payload.data.availability_status, 'Available')
    assert.equal(response.payload.data.availability_note, 'Vacation: Back next week')
    assert.equal(response.payload.data.active_work.total, 3)
    assert.deepEqual(calls.getAvailabilityRecord, ['user-1'])
    assert.deepEqual(calls.getActiveWorkSummary, ['user-1'])
  })

  it('allows admins to read another user availability', async () => {
    const { controller, calls } = loadController()

    const response = await callGet(controller, {
      requester: { id: 'admin-1', role_id: 3 },
      userId: 'user-1',
    })

    assert.equal(response.statusCode, 200)
    assert.deepEqual(calls.getAvailabilityRecord, ['user-1'])
  })

  it('rejects non-admin reads for another user', async () => {
    const { controller, calls } = loadController()

    const response = await callGet(controller, {
      requester: { id: 'user-2', role_id: 2 },
      userId: 'user-1',
    })

    assert.equal(response.statusCode, 403)
    assert.match(response.payload.error, /own availability/i)
    assert.deepEqual(calls.getAvailabilityRecord, [])
    assert.deepEqual(calls.getActiveWorkSummary, [])
  })
})
