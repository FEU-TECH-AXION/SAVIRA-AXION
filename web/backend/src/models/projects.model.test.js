const assert = require('node:assert/strict')
const { describe, it, afterEach } = require('node:test')

const supabasePath = require.resolve('../config/supabase')
const modelPath = require.resolve('./projects.model')

function loadModelWithUsers(users, error = null) {
  delete require.cache[modelPath]
  delete require.cache[supabasePath]

  require.cache[supabasePath] = {
    id: supabasePath,
    filename: supabasePath,
    loaded: true,
    exports: {
      from(table) {
        assert.equal(table, 'users')
        return {
          select() {
            return this
          },
          eq(column, value) {
            assert.equal(column, 'is_active')
            assert.equal(value, true)
            return this
          },
          in(column, values) {
            assert.equal(column, 'availability_status')
            assert.deepEqual(values, ['On Leave', 'Out of Office'])
            return { data: users, error }
          },
        }
      },
    },
  }

  return require('./projects.model')
}

afterEach(() => {
  delete require.cache[modelPath]
  delete require.cache[supabasePath]
})

describe('validateProjectPersonnelAvailability', () => {
  it('rejects project personnel who match unavailable active staff', async () => {
    const model = loadModelWithUsers([
      {
        first_name: 'Juan',
        last_name: 'Dela Cruz',
        availability_status: 'On Leave',
        roles: { role_name: 'Staff' },
      },
    ])

    await assert.rejects(
      () => model.validateProjectPersonnelAvailability({
        projectOfficers: [' juan dela cruz '],
        projectCommitteeMembers: ['External Partner'],
      }),
      (error) => {
        assert.equal(error.status, 400)
        assert.match(error.message, /Juan Dela Cruz|juan dela cruz/i)
        assert.match(error.message, /On Leave/)
        return true
      }
    )
  })

  it('allows names that do not resolve to known unavailable staff', async () => {
    const model = loadModelWithUsers([
      {
        first_name: 'Maria',
        last_name: 'Santos',
        availability_status: 'Out of Office',
        roles: { role_name: 'Staff' },
      },
    ])

    await assert.doesNotReject(() => model.validateProjectPersonnelAvailability({
      projectOfficers: ['External Partner'],
      projectCommitteeMembers: ['Available Volunteer'],
    }))
  })

  it('allows unavailable users outside project assignment roles', async () => {
    const model = loadModelWithUsers([
      {
        first_name: 'Juan',
        last_name: 'Dela Cruz',
        availability_status: 'Out of Office',
        roles: { role_name: 'Admin' },
      },
    ])

    await assert.doesNotReject(() => model.validateProjectPersonnelAvailability({
      projectOfficers: ['Juan Dela Cruz'],
    }))
  })
})
