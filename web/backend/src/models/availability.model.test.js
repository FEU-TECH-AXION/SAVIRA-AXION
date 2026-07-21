const assert = require('node:assert/strict')
const { describe, it, afterEach } = require('node:test')

const supabasePath = require.resolve('../config/supabase')
const modelPath = require.resolve('./availability.model')

function queryResult(result) {
  return {
    select() { return this },
    eq() { return this },
    in() { return this },
    gte() { return this },
    not() { return this },
    order() { return this },
    maybeSingle() { return result },
    single() { return result },
    update() { return this },
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

  return require('./availability.model')
}

afterEach(() => {
  delete require.cache[modelPath]
  delete require.cache[supabasePath]
})

describe('availability project loads', () => {
  it('counts active project_assignments in getActiveWorkSummary without legacy name matching', async () => {
    const today = new Date().toISOString().slice(0, 10)
    const model = loadModelWithTables({
      users: {
        user_id: 'user-7',
        first_name: 'Juan',
        last_name: 'Dela Cruz',
        is_active: true,
        roles: { role_name: 'Staff' },
      },
      case_officers: [],
      legal_personnels: [],
      staff: [{ staff_id: 7, user_id: 'user-7' }],
      project_assignments: [
        {
          staff_id: 7,
          projects: { project_id: 10, project_status: null, start_date: today, end_date: null },
        },
        {
          staff_id: 7,
          projects: { project_id: 10, project_status: null, start_date: today, end_date: null },
        },
      ],
      volunteer_application_assignments: [],
    })

    const summary = await model.getActiveWorkSummary('user-7')

    assert.equal(summary.projects, 1)
    assert.equal(summary.total, 1)
  })
})
