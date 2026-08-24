const express = require('express');
const { ActivityLog, User, SOPDocument } = require('../models');
const { requireAuth } = require('../middleware/auth');

const router = express.Router();

/**
 * GET /api/activities
 * Response: Array of ActivityLog dengan include User dan SOP
 */
router.get('/', requireAuth, async (req, res) => {
  try {
    const { limit = 100 } = req.query;
    const logs = await ActivityLog.findAll({
      order: [['created_at', 'DESC']],
      limit: parseInt(limit),
      include: [
        {
          model: User,
          as: 'user',
          attributes: ['id', 'full_name', 'email', 'role', 'department', 'avatar_url'],
        },
        {
          model: SOPDocument,
          as: 'sop',
          attributes: ['id', 'code', 'title', 'department'],
        },
      ],
    });
    return res.json(logs);
  } catch (err) {
    console.error('Error fetching activities:', err);
    return res.status(500).json({ detail: err.message });
  }
});

module.exports = router;
