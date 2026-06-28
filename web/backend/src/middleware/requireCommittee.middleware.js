const { supabaseAdmin } = require('../config/supabase')

const requireCommittee = (...allowedCommitteeIds) => {
  return async (req, res, next) => {
    try {
      // SECURITY: Must be authenticated
      if (!req.user) return res.status(401).json({ error: 'Unauthorized' })

      // SECURITY: Admins bypass committee check
      if (req.user.role === 'Admin') return next()

      // SECURITY: Only staff proceed to committee check
      if (req.user.role !== 'Staff') {
        return res.status(403).json({ error: 'Forbidden' })
      }

      // SECURITY: Look up this staff member's committee in the DB
      const { data, error } = await supabaseAdmin
        .from('staff')
        .select('committee_id')
        .eq('user_id', req.user.id)
        .maybeSingle()

      // SECURITY: If staff record missing or query fails, deny access
      if (error || !data) {
        return res.status(403).json({ error: 'Forbidden' })
      }

      // SECURITY: Check if their committee is in the allowed list
      if (!allowedCommitteeIds.includes(data.committee_id)) {
        return res.status(403).json({ error: 'Forbidden' })
      }

      req.user.committee_id = data.committee_id
      next()
    } catch (err) {
      return res.status(500).json({ error: 'Internal server error' })
    }
  }
}

module.exports = requireCommittee
