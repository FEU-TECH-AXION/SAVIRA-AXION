const authorize = (...allowedRoles) => {
  return (req, res, next) => {
    // SECURITY: verifyToken must run before authorize
    if (!req.user) return res.status(401).json({ error: 'Unauthorized' })

    // SECURITY: Reject if user role not in allowed list - never leak which roles are allowed
    if (!allowedRoles.includes(req.user.role)) {
      return res.status(403).json({ error: 'Forbidden' })
    }

    next()
  }
}

module.exports = authorize
