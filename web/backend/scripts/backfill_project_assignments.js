// One-off migration helper for backfilling project_assignments from legacy
// projects.project_officers and projects.project_committee_members name arrays.
// Safe to re-run: dry-run writes only the JSON report, and real mode skips
// active assignments that already exist. Run with --dry-run first.

require('dotenv').config()

const fs = require('fs/promises')
const path = require('path')
const crypto = require('crypto')
const supabase = require('../src/config/supabase')
const { normalizeName, matchNamesToStaff } = require('../src/utils/projectPersonnelMatching')

const REPORT_PATH = path.join(__dirname, 'project_assignments_backfill_report.json')
const dryRun = process.argv.includes('--dry-run')

const asArray = (value) => {
  if (Array.isArray(value)) return value
  return value ? [value] : []
}

const staffFullName = (staffRow) =>
  `${staffRow.users?.first_name || ''} ${staffRow.users?.last_name || ''}`.trim()

async function loadProjects() {
  const { data, error } = await supabase
    .from('projects')
    .select('project_id, event_name, project_officers, project_committee_members')

  if (error) throw error

  return (data || []).filter((project) =>
    asArray(project.project_officers).some(Boolean) ||
    asArray(project.project_committee_members).some(Boolean)
  )
}

async function loadActiveStaffByName() {
  const { data, error } = await supabase
    .from('staff')
    .select(`
      staff_id,
      user_id,
      users (
        user_id,
        first_name,
        last_name,
        is_active
      )
    `)

  if (error) throw error

  const staffByName = new Map()
  for (const row of data || []) {
    if (row.users?.is_active === false) continue
    const name = staffFullName(row)
    const key = normalizeName(name)
    if (!key) continue
    if (!staffByName.has(key)) staffByName.set(key, [])
    staffByName.get(key).push({
      staff_id: row.staff_id,
      user_id: row.user_id || row.users?.user_id,
      name,
    })
  }
  return staffByName
}

function collectRows(projects, activeStaffList) {
  const dropped = []
  const rowsByKey = new Map()

  const collectName = (project, sourceField, projectRole, rawName) => {
    const name = String(rawName || '').trim()
    if (!normalizeName(name)) return

    const result = matchNamesToStaff(name ? [name] : [], activeStaffList)
    if (result.unmatched.length > 0) {
      dropped.push({
        project_id: project.project_id,
        project_name: project.event_name || null,
        source_field: sourceField,
        unmatched_name: name,
        reason: 'unmatched',
      })
      return
    }

    if (result.ambiguous.length > 0) {
      dropped.push({
        project_id: project.project_id,
        project_name: project.event_name || null,
        source_field: sourceField,
        unmatched_name: name,
        reason: 'ambiguous',
        matched_staff_ids: result.ambiguous[0].staff_ids,
      })
      return
    }

    const staff = activeStaffList.find((item) => item.staff_id === result.matched[0]?.staff_id)
    if (!staff) return
    const rowKey = `${project.project_id}:${staff.staff_id}:${projectRole}`
    if (!rowsByKey.has(rowKey)) {
      rowsByKey.set(rowKey, {
        project_id: project.project_id,
        staff_id: staff.staff_id,
        project_role: projectRole,
        is_active: true,
      })
    }
  }

  for (const project of projects) {
    for (const name of asArray(project.project_officers)) {
      collectName(project, 'project_officers', 'officer', name)
    }
    for (const name of asArray(project.project_committee_members)) {
      collectName(project, 'project_committee_members', 'committee_member', name)
    }
  }

  return { rows: [...rowsByKey.values()], dropped }
}

async function filterExistingActiveRows(rows) {
  if (rows.length === 0) return rows

  const { data, error } = await supabase
    .from('project_assignments')
    .select('project_id, staff_id, project_role')
    .eq('is_active', true)

  if (error) throw error

  const existing = new Set((data || []).map((row) =>
    `${row.project_id}:${row.staff_id}:${row.project_role}`
  ))

  return rows.filter((row) =>
    !existing.has(`${row.project_id}:${row.staff_id}:${row.project_role}`)
  )
}

async function insertRows(rows) {
  if (rows.length === 0) return []

  const assignmentBatchId = crypto.randomUUID()
  const rowsToInsert = rows.map((row) => ({
    ...row,
    assigned_by: null,
    assignment_batch_id: assignmentBatchId,
  }))

  const { data, error } = await supabase
    .from('project_assignments')
    .insert(rowsToInsert)
    .select('assignment_id, project_id, staff_id, project_role')

  if (error) throw error
  return data || []
}

async function writeReport(report) {
  await fs.writeFile(REPORT_PATH, `${JSON.stringify(report, null, 2)}\n`)
}

async function main() {
  const projects = await loadProjects()
  const staffByName = await loadActiveStaffByName()
  const activeStaffList = [...staffByName.values()].flat()
  const { rows, dropped } = collectRows(projects, activeStaffList)

  let rowsToInsert = rows
  let inserted = []
  if (!dryRun) {
    rowsToInsert = await filterExistingActiveRows(rows)
    inserted = await insertRows(rowsToInsert)
  }

  const unmatched = dropped.filter((item) => item.reason === 'unmatched')
  const ambiguous = dropped.filter((item) => item.reason === 'ambiguous')
  const report = {
    generated_at: new Date().toISOString(),
    dry_run: dryRun,
    total_projects_scanned: projects.length,
    total_matched_inserted: inserted.length,
    total_matched_would_insert: dryRun ? rows.length : 0,
    total_matched_skipped_existing: dryRun ? 0 : rows.length - rowsToInsert.length,
    total_dropped_unmatched: unmatched.length,
    total_dropped_ambiguous: ambiguous.length,
    dropped,
  }

  await writeReport(report)

  const label = dryRun ? 'DRY RUN' : 'REAL RUN'
  const matchedLabel = dryRun
    ? `${rows.length} would be inserted`
    : `${inserted.length} inserted, ${report.total_matched_skipped_existing} skipped existing`

  console.log(`[${label}] project_assignments backfill complete`)
  console.log(`Projects scanned: ${projects.length}`)
  console.log(`Personnel matched: ${matchedLabel}`)
  console.log(`Dropped unmatched: ${unmatched.length}`)
  console.log(`Dropped ambiguous: ${ambiguous.length}`)
  console.log(`Report written: ${REPORT_PATH}`)
}

main().catch((error) => {
  console.error('project_assignments backfill failed:', error)
  process.exit(1)
})
