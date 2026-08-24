const express = require('express');
const { v4: uuidv4 } = require('uuid');
const { SOPRevision, SOPDocument, ActivityLog, User } = require('../models');
const { requireAuth, requireRole } = require('../middleware/auth');

const router = express.Router();

async function logActivity(user_id, sop_id, action, description) {
  try {
    await ActivityLog.create({ id: uuidv4(), user_id, sop_id, action, description });
  } catch (err) {
    console.error('⚠️ Log activity failed:', err.message);
  }
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
      include: [
        {
          model: SOPDocument,
          as: 'sop',
          attributes: ['id', 'code', 'title', 'department', 'status', 'approval_status'],
        },
        {
          model: User,
          as: 'reviser',
          attributes: ['id', 'full_name', 'email', 'role'],
        },
      ],
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
      include: [
        {
          model: User,
          as: 'reviser',
          attributes: ['id', 'full_name', 'email', 'role'],
        },
      ],
    });
    return res.json(revisions);
  } catch (err) {
    return res.status(500).json({ detail: err.message });
  }
});

// GET /api/revisions/:id — detail revisi
router.get('/:id', requireAuth, async (req, res) => {
  try {
    const revision = await SOPRevision.findByPk(req.params.id, {
      include: [
        {
          model: SOPDocument,
          as: 'sop',
        },
        {
          model: User,
          as: 'reviser',
          attributes: ['id', 'full_name', 'email', 'role'],
        },
        {
          model: User,
          as: 'reviewer',
          attributes: ['id', 'full_name', 'email', 'role'],
        },
      ],
    });
    if (!revision) return res.status(404).json({ detail: 'Revisi tidak ditemukan' });
    return res.json(revision);
  } catch (err) {
    return res.status(500).json({ detail: err.message });
  }
});

// POST /api/revisions — buat revisi baru
router.post('/', requireAuth, async (req, res) => {
  try {
    const { sop_id, title, version, changes_description, status, old_data, new_data } = req.body;

    const sop = await SOPDocument.findByPk(sop_id);
    if (!sop) return res.status(404).json({ detail: 'SOP tidak ditemukan' });

    const revision = await SOPRevision.create({
      id: uuidv4(),
      sop_id,
      title: title || `Revisi SOP: ${sop.title}`,
      version: version || (sop.version + 1),
      changes_description: changes_description || 'Mengajukan revisi SOP',
      status: status || 'menunggu_persetujuan',
      revised_by: req.user.id,
      revision_date: new Date(),
      old_data: old_data || null,
      new_data: new_data || null,
    });

    await logActivity(req.user.id, sop_id, 'CREATE_REVISION', `Created revision v${revision.version} for SOP: ${sop.title}`);
    return res.status(201).json(revision);
  } catch (err) {
    return res.status(500).json({ detail: err.message });
  }
});

// PUT /api/revisions/:id — update revisi
router.put('/:id', requireAuth, async (req, res) => {
  try {
    const revision = await SOPRevision.findByPk(req.params.id);
    if (!revision) return res.status(404).json({ detail: 'Revisi tidak ditemukan' });

    const allowed = ['title', 'changes_description', 'status', 'reviewed_by', 'approval_date', 'review_notes', 'new_data'];
    const updates = {};
    allowed.forEach(f => { if (req.body[f] !== undefined) updates[f] = req.body[f]; });

    await revision.update(updates);
    return res.json(revision);
  } catch (err) {
    return res.status(500).json({ detail: err.message });
  }
});

// PUT /api/revisions/:id/approve — approve revisi
router.put('/:id/approve', requireAuth, requireRole(['admin', 'kepala_bagian', 'ketua_tim']), async (req, res) => {
  try {
    const revision = await SOPRevision.findByPk(req.params.id);
    if (!revision) return res.status(404).json({ detail: 'Revisi tidak ditemukan' });

    const { review_notes = 'Revisi disetujui' } = req.body;

    await revision.update({
      status: 'disetujui',
      reviewed_by: req.user.id,
      approval_date: new Date(),
      review_notes,
    });

    // Aktifkan SOP & update versi jika ada data baru
    const sop = await SOPDocument.findByPk(revision.sop_id);
    if (sop) {
      const updates = {
        version: revision.version,
        status: 'aktif',
        approval_status: 'approved',
        approved_by: req.user.id,
        updated_by: req.user.id,
      };

      if (revision.new_data && typeof revision.new_data === 'object') {
        if (revision.new_data.title) updates.title = revision.new_data.title;
        if (revision.new_data.description) updates.description = revision.new_data.description;
        if (revision.new_data.department) updates.department = revision.new_data.department;
        if (revision.new_data.responsible_person) updates.responsible_person = revision.new_data.responsible_person;
      }

      await sop.update(updates);
    }

    await logActivity(req.user.id, revision.sop_id, 'APPROVE_REVISION', `Approved revision v${revision.version}: ${revision.title}`);
    return res.json({ message: 'Revision approved successfully', revision, sop });
  } catch (err) {
    return res.status(500).json({ detail: err.message });
  }
});

// PUT /api/revisions/:id/reject — reject revisi
router.put('/:id/reject', requireAuth, requireRole(['admin', 'kepala_bagian', 'ketua_tim']), async (req, res) => {
  try {
    const revision = await SOPRevision.findByPk(req.params.id);
    if (!revision) return res.status(404).json({ detail: 'Revisi tidak ditemukan' });

    const reason = req.body.reject_reason || req.body.rejection_reason || req.body.reason || req.body.review_notes || 'Revisi ditolak';

    await revision.update({
      status: 'ditolak',
      reviewed_by: req.user.id,
      approval_date: new Date(),
      review_notes: reason,
    });

    // Perbarui status SOP
    const sop = await SOPDocument.findByPk(revision.sop_id);
    if (sop) {
      await sop.update({ approval_status: 'rejected', status: 'draft' });
    }

    await logActivity(req.user.id, revision.sop_id, 'REJECT_REVISION', `Rejected revision v${revision.version}: ${reason}`);
    return res.json({ message: 'Revision rejected successfully', revision, sop });
  } catch (err) {
    return res.status(500).json({ detail: err.message });
  }
});

// DELETE /api/revisions/:id — hapus revisi
router.delete('/:id', requireAuth, requireRole(['admin', 'kepala_bagian']), async (req, res) => {
  try {
    const revision = await SOPRevision.findByPk(req.params.id);
    if (!revision) return res.status(404).json({ detail: 'Revisi tidak ditemukan' });

    await logActivity(req.user.id, revision.sop_id, 'DELETE_REVISION', `Deleted revision v${revision.version}: ${revision.title}`);
    await revision.destroy();
    return res.json({ message: 'Revision deleted successfully' });
  } catch (err) {
    return res.status(500).json({ detail: err.message });
  }
});

module.exports = router;
