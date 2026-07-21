const assert = require('node:assert/strict')
const { describe, it, afterEach } = require('node:test')

const supabasePath = require.resolve('../config/supabase')
const actorPath = require.resolve('../utils/actor')
const modelPath = require.resolve('./projects.model')

const staffRows = [
  {
    staff_id: 1,
    user_id: 'user-1',
    users: {
      user_id: 'user-1',
      first_name: 'Juan',
      last_name: 'Dela Cruz',
      availability_status: 'Available',
      is_active: true,
    },
  },
  {
    staff_id: 2,
    user_id: 'user-2',
    users: {
      user_id: 'user-2',
      first_name: 'Maria',
      last_name: 'Santos',
      availability_status: 'On Leave',
      is_active: true,
    },
  },
  {
    staff_id: 3,
    user_id: 'user-3',
    users: {
      user_id: 'user-3',
      first_name: 'Alex',
      last_name: 'Reyes',
      availability_status: 'Available',
      is_active: true,
    },
  },
  {
    staff_id: 4,
    user_id: 'user-4',
    users: {
      user_id: 'user-4',
      first_name: 'Alex',
      last_name: 'Reyes',
      availability_status: 'Available',
      is_active: true,
    },
  },
]

function setActorMock() {
  require.cache[actorPath] = {
    id: actorPath,
    filename: actorPath,
    loaded: true,
    exports: {
      resolveActors: async () => ({}),
    },
  }
}

function loadModelWithSupabase(mock) {
  delete require.cache[modelPath]
  delete require.cache[supabasePath]
  delete require.cache[actorPath]

  require.cache[supabasePath] = {
    id: supabasePath,
    filename: supabasePath,
    loaded: true,
    exports: mock,
  }
  setActorMock()

  return require('./projects.model')
}

function makeStaffOnlySupabase(rows = staffRows) {
  return {
    from(table) {
      assert.equal(table, 'staff')
      return {
        select() {
          return { data: rows, error: null }
        },
      }
    },
  }
}

function makeCreateSupabase({ rows = staffRows } = {}) {
  const calls = {
    projectInsert: null,
    assignmentUpdateFilters: [],
    assignmentInsert: null,
  }

  const supabase = {
    calls,
    from(table) {
      if (table === 'staff') {
        return {
          select() {
            return { data: rows, error: null }
          },
        }
      }

      if (table === 'projects') {
        return {
          insert(payload) {
            calls.projectInsert = payload[0]
            return {
              select() {
                return {
                  data: [{
                    project_id: 42,
                    ...payload[0],
                    created_at: null,
                    updated_at: null,
                  }],
                  error: null,
                }
              },
            }
          },
        }
      }

      if (table === 'project_assignments') {
        return {
          update(payload) {
            calls.assignmentUpdate = payload
            return {
              eq(column, value) {
                calls.assignmentUpdateFilters.push([column, value])
                return this
              },
              error: null,
            }
          },
          insert(payload) {
            calls.assignmentInsert = payload
            return {
              select() {
                return { data: payload.map((row, index) => ({ assignment_id: index + 1, ...row })), error: null }
              },
            }
          },
          select() {
            return {
              in() {
                return this
              },
              eq() {
                return { data: calls.assignmentInsert || [], error: null }
              },
            }
          },
        }
      }

      throw new Error(`Unexpected table: ${table}`)
    },
  }

  return supabase
}

afterEach(() => {
  delete require.cache[modelPath]
  delete require.cache[supabasePath]
  delete require.cache[actorPath]
})

describe('resolveProjectPersonnel', () => {
  it('matches active staff names with the strict normalizer and returns canonical names', async () => {
    const model = loadModelWithSupabase(makeStaffOnlySupabase())

    const result = await model.resolveProjectPersonnel({
      projectOfficers: [' juan   dela cruz '],
      projectCommitteeMembers: [],
    })

    assert.deepEqual(result.project_officers, ['Juan Dela Cruz'])
    assert.deepEqual(result.assignmentRows, [{
      staff_id: 1,
      project_role: 'officer',
      is_active: true,
    }])
  })

  it('rejects names that do not match an active staff member', async () => {
    const model = loadModelWithSupabase(makeStaffOnlySupabase())

    await assert.rejects(
      () => model.resolveProjectPersonnel({ projectOfficers: ['External Partner'] }),
      (error) => {
        assert.equal(error.status, 400)
        assert.match(error.message, /External Partner \(unmatched\)/)
        return true
      }
    )
  })

  it('rejects ambiguous active staff name matches', async () => {
    const model = loadModelWithSupabase(makeStaffOnlySupabase())

    await assert.rejects(
      () => model.resolveProjectPersonnel({ projectOfficers: ['Alex Reyes'] }),
      (error) => {
        assert.equal(error.status, 400)
        assert.match(error.message, /Alex Reyes \(ambiguous: matched 2 staff records\)/)
        return true
      }
    )
  })

  it('rejects matched staff who are unavailable', async () => {
    const model = loadModelWithSupabase(makeStaffOnlySupabase())

    await assert.rejects(
      () => model.resolveProjectPersonnel({ projectCommitteeMembers: ['Maria Santos'] }),
      (error) => {
        assert.equal(error.status, 400)
        assert.match(error.message, /Maria Santos \(On Leave\)/)
        return true
      }
    )
  })

  it('uses staff_id arrays directly when present', async () => {
    const model = loadModelWithSupabase(makeStaffOnlySupabase())

    const result = await model.resolveProjectPersonnel({
      projectOfficerIds: [1],
      projectCommitteeMemberIds: [],
      projectOfficers: ['Ignored Name'],
    })

    assert.deepEqual(result.project_officers, ['Juan Dela Cruz'])
    assert.deepEqual(result.assignmentRows, [{
      staff_id: 1,
      project_role: 'officer',
      is_active: true,
    }])
  })

  it('rejects invalid staff_id values in ID payloads', async () => {
    const model = loadModelWithSupabase(makeStaffOnlySupabase())

    await assert.rejects(
      () => model.resolveProjectPersonnel({ projectOfficerIds: [999] }),
      (error) => {
        assert.equal(error.status, 400)
        assert.match(error.message, /staff_id 999 \(unmatched\)/)
        return true
      }
    )
  })

  it('rejects unavailable staff_id values in ID payloads', async () => {
    const model = loadModelWithSupabase(makeStaffOnlySupabase())

    await assert.rejects(
      () => model.resolveProjectPersonnel({ projectCommitteeMemberIds: [2] }),
      (error) => {
        assert.equal(error.status, 400)
        assert.match(error.message, /Maria Santos \(On Leave\)/)
        return true
      }
    )
  })
})

describe('create', () => {
  it('dual-writes canonical project names and active relational assignments', async () => {
    const supabase = makeCreateSupabase()
    const model = loadModelWithSupabase(supabase)

    await model.create({
      title: 'Community Project',
      projectOfficers: ['juan   dela cruz'],
      projectCommitteeMembers: ['Juan Dela Cruz'],
      createdById: 'admin-1',
      createdByRole: 'Admin',
    })

    assert.deepEqual(supabase.calls.projectInsert.project_officers, ['Juan Dela Cruz'])
    assert.deepEqual(supabase.calls.projectInsert.project_committee_members, ['Juan Dela Cruz'])
    assert.deepEqual(supabase.calls.assignmentUpdateFilters, [
      ['project_id', 42],
      ['is_active', true],
    ])
    assert.equal(supabase.calls.assignmentInsert.length, 2)
    assert.deepEqual(
      supabase.calls.assignmentInsert.map((row) => ({
        project_id: row.project_id,
        staff_id: row.staff_id,
        project_role: row.project_role,
        is_active: row.is_active,
        assigned_by: row.assigned_by,
      })),
      [
        { project_id: 42, staff_id: 1, project_role: 'officer', is_active: true, assigned_by: 'admin-1' },
        { project_id: 42, staff_id: 1, project_role: 'committee_member', is_active: true, assigned_by: 'admin-1' },
      ]
    )
    assert.ok(supabase.calls.assignmentInsert.every((row) => row.assignment_batch_id))
    assert.equal(
      new Set(supabase.calls.assignmentInsert.map((row) => row.assignment_batch_id)).size,
      1
    )
  })

  it('creates from ID payloads and exposes active assignment IDs in the response', async () => {
    const supabase = makeCreateSupabase()
    const model = loadModelWithSupabase(supabase)

    const project = await model.create({
      title: 'ID Project',
      projectOfficerIds: [1],
      projectCommitteeMemberIds: [],
      createdById: 'admin-1',
      createdByRole: 'Admin',
    })

    assert.deepEqual(supabase.calls.projectInsert.project_officers, ['Juan Dela Cruz'])
    assert.deepEqual(supabase.calls.projectInsert.project_committee_members, [])
    assert.deepEqual(project.projectOfficerIds, [1])
    assert.deepEqual(project.projectCommitteeMemberIds, [])
  })
})
