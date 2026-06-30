const FIELD_TO_COLUMN = new Map([
  ['complainant.contactNumber', 'contact_number'],
  ['complainant.email', 'email'],
  ['incident.date', 'incident_date'],
  ['incident.incidentYear', 'incident_year'],
  ['incident.incidentMonth', 'incident_month'],
  ['incident.incidentDay', 'incident_day'],
  ['incident.time', 'incident_time'],
  ['incident.locationType', 'incident_location_type'],
  ['incident.incidentCity', 'incident_city'],
  ['incident.incidentVenue', 'incident_location'],
  ['incident.description', 'incident_description'],
  ['incident.outcome', 'action_requested'],
  ['incident.perpetratorKnown', 'is_perpetrator_known'],
  ['incident.perpetratorName', 'perpetrator_name'],
  ['incident.perpetratorOccupation', 'perpetrator_occupation'],
  ['incident.perpetratorRelationship', 'perpetrator_relationship'],
  ['incident.perpetratorGender', 'perpetrator_gender'],
  ['incident.perpetratorUnknownGender', 'perpetrator_unknown_gender'],
  ['incident.perpetratorUnknownAppearance', 'perpetrator_unknown_appearance'],
  ['incident.witnesses', 'has_witnesses'],
  ['incident.witnessName', 'witness_name'],
  ['incident.witnessContact', 'witness_contact'],
  ['incident.witnessRelationship', 'witness_relationship'],
  ['incident.toldAnyone', 'reported_to_others'],
  ['incident.toldAnyoneWho', 'told_anyone_who'],
  ['incident.toldPolice', 'reported_to_police'],
  ['incident.policeStation', 'police_station'],
])

function comparable(value) {
  if (value === undefined) return null
  if (value instanceof Date) return value.toISOString()
  if (typeof value === 'object' && value !== null) return JSON.stringify(value)
  return String(value)
}

function shouldApplyAuditValue(currentValue, previousValue, newValue) {
  if (comparable(currentValue) === comparable(newValue)) return false
  if (currentValue === null || currentValue === undefined || currentValue === '') return true
  return comparable(currentValue) === comparable(previousValue)
}

function isEmpty(value) {
  return value === null || value === undefined || value === ''
}

function normalizePerpetratorGenderColumns(report = {}) {
  const normalized = { ...report }
  if (
    normalized.is_perpetrator_known === false &&
    isEmpty(normalized.perpetrator_unknown_gender) &&
    !isEmpty(normalized.perpetrator_gender)
  ) {
    normalized.perpetrator_unknown_gender = normalized.perpetrator_gender
  }
  return normalized
}

function columnForChange(change, report = {}) {
  // Requests created before the unknown-perpetrator fields were added used
  // perpetratorGender for the single visible gender input. Preserve those
  // approved values in the column consumed by the current case-detail views.
  if (
    change.field_key === 'incident.perpetratorGender' &&
    report.is_perpetrator_known === false
  ) {
    return 'perpetrator_unknown_gender'
  }
  return FIELD_TO_COLUMN.get(change.field_key)
}

function buildApprovedFieldUpdate(changes = [], report = {}) {
  const working = normalizePerpetratorGenderColumns(report)
  const update = {}
  for (const change of changes) {
    const column = columnForChange(change, working)
    if (!column) continue
    update[column] = change.new_value
    working[column] = change.new_value
  }
  return update
}

function mergeApprovedFieldChanges(report, changes = []) {
  const merged = normalizePerpetratorGenderColumns(report)
  for (const change of changes) {
    const column = columnForChange(change, merged)
    if (
      column &&
      shouldApplyAuditValue(merged[column], change.previous_value, change.new_value)
    ) {
      merged[column] = change.new_value
    }
  }
  return merged
}

module.exports = {
  FIELD_TO_COLUMN,
  buildApprovedFieldUpdate,
  columnForChange,
  mergeApprovedFieldChanges,
  normalizePerpetratorGenderColumns,
  shouldApplyAuditValue,
}
