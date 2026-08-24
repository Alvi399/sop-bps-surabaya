const jwt = require('jsonwebtoken');
const { User } = require('../models');

/**
 * Middleware: verifikasi JWT token
 * Ekuivalen dengan get_current_user di auth.py (FastAPI)
 */
const requireAuth = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ detail: 'Could not validate credentials' });
    }

    const token = authHeader.split(' ')[1];
    const payload = jwt.verify(token, process.env.JWT_SECRET || 'secret-key-sop-bps-surabaya');

    const user = await User.findByPk(payload.id);
    if (!user) {
      return res.status(401).json({ detail: 'Could not validate credentials' });
    }

    req.user = user;
    next();
  } catch (err) {
    return res.status(401).json({ detail: 'Could not validate credentials' });
  }
};

/**
 * Middleware: cek role user
 * Ekuivalen dengan require_role() di auth.py (FastAPI)
 * Contoh: requireRole(['admin', 'kepala_bagian'])
 */
const requireRole = (allowedRoles) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ detail: 'Not authenticated' });
    }
    if (!allowedRoles.includes(req.user.role)) {
      return res.status(403).json({ detail: "You don't have permission to perform this action" });
    }
    next();
  };
};

module.exports = { requireAuth, requireRole };
