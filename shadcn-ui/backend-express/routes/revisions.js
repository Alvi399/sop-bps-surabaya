const express = require('express');
const { v4: uuidv4 } = require('uuid');
const { SOPRevision, SOPDocument, ActivityLog } = require('../models');
const { requireAuth, requireRole } = require('../middleware/auth');

const router = express.Router();

async function logActivity(user_id, sop_id, action, description) {
  await ActivityLog.create({ id: uuidv4(), user_id, sop_id, action, description });
}

// GET /api/revisions — semua revisi, bisa filter by status
router.get('/', requireAuth, async (req, res) => {
  try {
    const { status, skip = 0, limit = 100 } = req.query;
    const where = status ? { status } : {};
    const revisions = await SOPRevision.findAll({
      where,
      order: [['revision_date', 'DESC']],
      offset: parseInt(skip),
      limit: parseInt(limit),
    });
    return res.json(revisions);
  } catch (err) {
    return res.status(500).json({ detail: err.message });
  }
});

// GET /api/revisions/sop/:sop_id — revisi per SOP
router.get('/sop/:sop_id', requireAuth, async (req, res) => {
  try {
    const revisions = await SOPRevision.findAll({
      where: { sop_id: req.params.sop_id },
      order: [['version', 'DESC']],
    });
    return res.json(revisions);
  } catch (err) {
    return res.status(500).json({ detail: err.message });
  }
});

// GET /api/revisions/:id — detail revisi
router.get('/:id', requireAuth, async (req, res) => {
  try {
    const revision = await SOPRevision.findByPk(req.params.id);
    if (!revision) return res.status(404).json({ detail: 'Revision not found' });
    return res.json(revision);
  } catch (err) {
    return res.status(500).json({ detail: err.message });
  }
});

// POST /api/revisions — buat revisi baru
router.post('/', requireAuth, requireRole(['admin', 'kepala_bagian', 'ketua_tim']), async (req, res) => {
  try {
    const { sop_id, title, version, changes_description, status } = req.body;

    const sop = await SOPDocument.findByPk(sop_id);
    if (!sop) return res.status(404).json({ detail: 'SOP not found' });

    const revision = await SOPRevision.create({
      id: uuidv4(),
      sop_id,
      title,
      version,
      changes_description,
      status: status || 'menunggu_persetujuan',
      revised_by: req.user.id,
      revision_date: new Date(),
    });

    await logActivity(req.user.id, sop_id, 'create_revision', `Created revision v${version} for SOP: ${title}`);
    return res.status(201).json(revision);
  } catch (err) {
    return res.status(500).json({ detail: err.message });
  }
});

// PUT /api/revisions/:id — update revisi
router.put('/:id', requireAuth, requireRole(['admin', 'kepala_bagian', 'ketua_tim']), async (req, res) => {
  try {
    const revision = await SOPRevision.findByPk(req.params.id);
    if (!revision) return res.status(404).json({ detail: 'Revision not found' });

    const allowed = ['title', 'changes_description', 'status', 'reviewed_by', 'approval_date', 'review_notes'];
    const updates = {};
    allowed.forEach(f => { if (req.body[f] !== undefined) updates[f] = req.body[f]; });

    await revision.update(updates);
    return res.json(revision);
  } catch (err) {
    return res.status(500).json({ detail: err.message });
  }
});

// PUT /api/revisions/:id/approve — approve revisi
router.put('/:id/approve', requireAuth, requireRole(['admin', 'kepala_bagian']), async (req, res) => {
  try {
    const revision = await SOPRevision.findByPk(req.params.id);
    if (!revision) return res.status(404).json({ detail: 'Revision not found' });

    const { review_notes = '' } = req.body;

    await revision.update({
      status: 'disetujui',
      reviewed_by: req.user.id,
      approval_date: new Date(),
      review_notes,
    });

    // Aktifkan SOP
    const sop = await SOPDocument.findByPk(revision.sop_id);
    if (sop) {
      await sop.update({
        version: revision.version,
        status: 'active',
        approval_status: 'approved',
        approved_by: req.user.id,
        updated_by: req.user.id,
      });
    }

    await logActivity(req.user.id, revision.sop_id, 'APPROVE', `Approved revision v${revision.version}: ${revision.title}`);
    return res.json({ message: 'Revision approved successfully', revision });
  } catch (err) {
    return res.status(500).json({ detail: err.message });
  }
});

// PUT /api/revisions/:id/reject — reject revisi
router.put('/:id/reject', requireAuth, requireRole(['admin', 'kepala_bagian']), async (req, res) => {
  try {
    const revision = await SOPRevision.findByPk(req.params.id);
    if (!revision) return res.status(404).json({ detail: 'Revision not found' });

    const { reject_reason } = req.body;
    if (!reject_reason || !reject_reason.trim()) {
      return res.status(400).json({ detail: 'Reject reason is required' });
    }

    await revision.update({
      status: 'ditolak',
      reviewed_by: req.user.id,
      approval_date: new Date(),
      review_notes: reject_reason,
    });

    // Kembalikan SOP ke draft
    const sop = await SOPDocument.findByPk(revision.sop_id);
    if (sop) {
      await sop.update({ approval_status: 'rejected', status: 'draft' });
    }

    await logActivity(req.user.id, revision.sop_id, 'REJECT', `Rejected revision v${revision.version}: ${reject_reason}`);
    return res.json({ message: 'Revision rejected successfully', revision });
  } catch (err) {
    return res.status(500).json({ detail: err.message });
  }
});

// DELETE /api/revisions/:id — hapus revisi
router.delete('/:id', requireAuth, requireRole(['admin']), async (req, res) => {
  try {
    const revision = await SOPRevision.findByPk(req.params.id);
    if (!revision) return res.status(404).json({ detail: 'Revision not found' });

    await logActivity(req.user.id, revision.sop_id, 'delete_revision', `Deleted revision v${revision.version}: ${revision.title}`);
    await revision.destroy();
    return res.json({ message: 'Revision deleted successfully' });
  } catch (err) {
    return res.status(500).json({ detail: err.message });
  }
});

module.exports = router;
