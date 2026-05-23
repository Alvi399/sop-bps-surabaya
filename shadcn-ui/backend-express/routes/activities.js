const express = require('express');
const { ActivityLog } = require('../models');
const { requireAuth } = require('../middleware/auth');

const router = express.Router();

/**
 * GET /api/activities
 * Response: Array of ActivityLog
 */
router.get('/', requireAuth, async (req, res) => {
  try {
    const { limit = 50 } = req.query;
    const logs = await ActivityLog.findAll({
      order: [['created_at', 'DESC']],
      limit: parseInt(limit),
    });
    return res.json(logs);
  } catch (err) {
    console.error('Error fetching activities:', err);
    return res.status(500).json({ detail: err.message });
  }
});

module.exports = router;
