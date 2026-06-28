const supabase = require('../config/supabase')

const getApplicationId = (req) =>
  req.params.id || req.params.applicationId || req.body?.volunteer_application_id

const getAuthenticatedUserId = (req) =>
  req.user?.id || req.user?.user_id || req.user?.sub || null

const requireVolunteerApplicationAccess = async (req, res, next) => {
  try {
    if (!req.user) return res.status(401).json({ error: 'Unauthorized' })
    const userId = getAuthenticatedUserId(req)

    if (req.user.role === 'Admin') return next()

    if (req.user.role === 'Staff') {
      const { data, error } = await supabase
        .from('staff')
        .select('committee_id')
        .eq('user_id', userId)
        .maybeSingle()

      if (!error && data?.committee_id === 2) return next()
    }

    const applicationId = getApplicationId(req)
    if (!applicationId) return res.status(400).json({ error: 'Application id is required.' })

    const { data: application, error: applicationError } = await supabase
      .from('volunteer_applications')
      .select('volunteer_application_id, volunteer_applicant_id, email')
      .eq('volunteer_application_id', applicationId)
      .maybeSingle()

    if (applicationError || !application) {
      return res.status(404).json({ error: 'Application not found.' })
    }

    const { data: applicant, error: applicantError } = await supabase
      .from('volunteer_applicants')
      .select('user_id')
      .eq('volunteer_applicant_id', application.volunteer_applicant_id)
      .maybeSingle()

    if (applicantError) {
      return res.status(404).json({ error: 'Application not found.' })
    }

    const ownsApplicant = applicant && String(applicant.user_id) === String(userId)
    const ownsEmail = req.user?.email && String(application.email).toLowerCase() === String(req.user.email).toLowerCase()

    if (!ownsApplicant && !ownsEmail) {
      return res.status(403).json({ error: 'Forbidden' })
    }

    next()
  } catch (err) {
    return res.status(500).json({ error: 'Internal server error' })
  }
}

module.exports = requireVolunteerApplicationAccess
