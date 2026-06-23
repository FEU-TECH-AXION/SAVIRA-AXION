const supabase = require('../config/supabase')

const clean = (value) => String(value || '').trim().toLowerCase().replace(/\s+/g, ' ')

function textSimilarity(a, b) {
  const left = new Set(clean(a).split(/\W+/).filter((word) => word.length > 2))
  const right = new Set(clean(b).split(/\W+/).filter((word) => word.length > 2))
  if (!left.size || !right.size) return 0
  let overlap = 0
  for (const word of left) if (right.has(word)) overlap += 1
  return overlap / Math.max(left.size, right.size)
}

function dateDistanceDays(a, b) {
  if (!a || !b) return Infinity
  return Math.abs(new Date(a) - new Date(b)) / 86400000
}

function scoreReports(report, candidate) {
  let score = 0
  const fields = []

  if (clean(report.email) && clean(report.email) === clean(candidate.email)) {
    score += 30; fields.push('complainant email')
  }
  if (clean(report.contact_number) && clean(report.contact_number) === clean(candidate.contact_number)) {
    score += 25; fields.push('complainant contact')
  }
  if (clean(report.name) && clean(report.name) === clean(candidate.name)) {
    score += 20; fields.push('complainant name')
  }
  if (clean(report.perpetrator_name) && clean(report.perpetrator_name) === clean(candidate.perpetrator_name)) {
    score += 20; fields.push('respondent name')
  }
  const days = dateDistanceDays(report.incident_date, candidate.incident_date)
  if (days === 0) {
    score += 15; fields.push('same incident date')
  } else if (days <= 7) {
    score += 8; fields.push('incident dates within 7 days')
  }
  if (clean(report.incident_city) && clean(report.incident_city) === clean(candidate.incident_city)) {
    score += 8; fields.push('same city')
  }
  if (clean(report.incident_location) && clean(report.incident_location) === clean(candidate.incident_location)) {
    score += 7; fields.push('same location')
  }
  const descriptionSimilarity = textSimilarity(report.incident_description, candidate.incident_description)
  if (descriptionSimilarity >= 0.35) {
    score += Math.round(descriptionSimilarity * 25)
    fields.push('similar description')
  }

  return { score: Math.min(score, 100), fields }
}

async function detectForCase(report) {
  const { data: candidates, error } = await supabase
    .from('case_reports')
    .select(`
      case_report_id, name, email, contact_number, perpetrator_name,
      incident_date, incident_city, incident_location, incident_description
    `)
    .neq('case_report_id', report.case_report_id)
    .eq('is_current', true)
    .order('created_at', { ascending: false })
    .limit(500)
  if (error) throw error

  const matches = (candidates || [])
    .map((candidate) => ({ candidate, ...scoreReports(report, candidate) }))
    .filter((match) => match.score >= 45)
    .sort((a, b) => b.score - a.score)
    .slice(0, 5)

  if (!matches.length) return []
  const rows = matches.map(({ candidate, score, fields }) => ({
    case_report_id: report.case_report_id,
    matched_case_report_id: candidate.case_report_id,
    similarity_score: score,
    matched_fields: fields,
  }))
  const { error: insertError } = await supabase
    .from('case_duplicate_matches')
    .upsert(rows, { onConflict: 'case_report_id,matched_case_report_id' })
  if (insertError) throw insertError
  return rows
}

async function dismiss(matchId, userId) {
  const { data, error } = await supabase
    .from('case_duplicate_matches')
    .update({ dismissed_at: new Date().toISOString(), dismissed_by: userId })
    .eq('duplicate_match_id', matchId)
    .select()
    .single()
  if (error) throw error
  return data
}

module.exports = { detectForCase, dismiss }
