const assert = require('node:assert/strict')
const { describe, it, afterEach } = require('node:test')

const supabasePath = require.resolve('../config/supabase')
const modelPath = require.resolve('./staff.model')

function queryResult(result) {
  return {
    select() { return this },
    in() { return this },
    eq() { return this },
    not() { return this },
    then(resolve) { return Promise.resolve(resolve(result)) },
  }
}

function loadModelWithTables(tables) {
  delete require.cache[modelPath]
  delete require.cache[supabasePath]

  require.cache[supabasePath] = {
    id: supabasePath,
    filename: supabasePath,
    loaded: true,
    exports: {
      from(table) {
        if (!Object.prototype.hasOwnProperty.call(tables, table)) {
          throw new Error(`Unexpected table: ${table}`)
        }
        return queryResult({ data: tables[table], error: null })
      },
    },
  }

  return require('./staff.model')
}

afterEach(() => {
  delete require.cache[modelPath]
  delete require.cache[supabasePath]
})

describe('staff project loads', () => {
  it('counts active project_assignments without matching legacy project name arrays', async () => {
    const model = loadModelWithTables({
      staff: [{
        staff_id: 7,
        user_id: 'user-7',
        users: {
          first_name: 'Juan',
          last_name: 'Dela Cruz',
          availability_status: 'Available',
          max_project_assignments: 5,
          roles: { role_name: 'Staff' },
        },
        committees: { committee_id: 1, committee_name: 'Programs' },
      }],
      project_tasks: [],
      volunteer_application_assignments: [],
      project_assignments: [
        {
          staff_id: 7,
          projects: {
            project_id: 10,
            project_status: null,
            start_date: new Date().toISOString().slice(0, 10),
            end_date: null,
          },
        },
        {
          staff_id: 7,
          projects: {
            project_id: 10,
            project_status: null,
            start_date: new Date().toISOString().slice(0, 10),
            end_date: null,
          },
        },
      ],
    })

    const rows = await model.getAll()

    assert.equal(rows[0].active_projects, 1)
  })
})
