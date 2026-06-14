const jwt = require("jsonwebtoken");

// ── Verify token from httpOnly cookie ─────────────────────

const verifyToken = (req, res, next) => {
  // Try cookie first, fallback to Authorization Header
  let token = req.cookies.token;

  if (!token && req.headers.authorization) {
    const parts = req.headers.authorization.split(" ");
    if (parts[0] === "Bearer") {
      token = parts[1];
    }
  }

  if (!token)
    return res.status(401).json({ error: "Not authenticated. Please log in." });

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = decoded;
    next();
  } catch (err) {
    return res
      .status(401)
      .json({ error: "Session expired. Please log in again." });
  }
};

// ── Check if user's role is allowed ───────────────────────
// Usage: authorize('admin', 'case_officer')
const authorize = (...allowedRoles) => {
  return (req, res, next) => {
    if (!req.user) return res.status(401).json({ error: "Not authenticated." });

    if (!allowedRoles.includes(req.user.role))
      return res
        .status(403)
        .json({ error: "Access denied. Insufficient permissions." });
    next();
  };
};

module.exports = { verifyToken, authorize };
