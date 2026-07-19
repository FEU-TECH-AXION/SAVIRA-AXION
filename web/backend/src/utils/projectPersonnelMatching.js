const normalizeName = (value) =>
  String(value || '').trim().replace(/\s+/g, ' ').toLowerCase()

function matchNamesToStaff(names = [], activeStaffList = []) {
  const staffByName = new Map()
  for (const staff of activeStaffList || []) {
    const key = normalizeName(staff.name)
    if (!key) continue
    if (!staffByName.has(key)) staffByName.set(key, [])
    staffByName.get(key).push(staff)
  }

  const matched = []
  const unmatched = []
  const ambiguous = []
  const seen = new Set()

  for (const value of names || []) {
    const inputName = String(value || '').trim()
    const key = normalizeName(inputName)
    if (!key || seen.has(key)) continue
    seen.add(key)

    const matches = staffByName.get(key) || []
    if (matches.length === 0) {
      unmatched.push(inputName)
    } else if (matches.length > 1) {
      ambiguous.push({
        inputName,
        staff_ids: matches.map((staff) => staff.staff_id),
      })
    } else {
      matched.push({
        inputName,
        staff_id: matches[0].staff_id,
      })
    }
  }

  return { matched, unmatched, ambiguous }
}

module.exports = { normalizeName, matchNamesToStaff }
