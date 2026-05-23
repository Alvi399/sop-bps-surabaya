const express = require('express');
const { Op } = require('sequelize');
const { v4: uuidv4 } = require('uuid');
const path = require('path');
const fs = require('fs');
const { SOPDocument, SOPRevision, ActivityLog } = require('../models');
const { requireAuth, requireRole } = require('../middleware/auth');

const router = express.Router();

// Helper: buat activity log
async function logActivity(user_id, sop_id, action, description) {
  await ActivityLog.create({ id: uuidv4(), user_id, sop_id, action, description });
}

// GET /api/sops — semua SOP
router.get('/', requireAuth, async (req, res) => {
  try {
    const { skip = 0, limit = 100 } = req.query;
    const sops = await SOPDocument.findAll({ offset: parseInt(skip), limit: parseInt(limit) });
    return res.json(sops);
  } catch (err) {
    return res.status(500).json({ detail: err.message });
  }
});

// GET /api/sops/search/:query — search SOP
router.get('/search/:query', requireAuth, async (req, res) => {
  try {
    const { query } = req.params;
    const sops = await SOPDocument.findAll({
      where: {
        [Op.or]: [
          { title: { [Op.like]: `%${query}%` } },
          { code: { [Op.like]: `%${query}%` } },
          { description: { [Op.like]: `%${query}%` } },
        ],
      },
    });
    return res.json(sops);
  } catch (err) {
    return res.status(500).json({ detail: err.message });
  }
});

// GET /api/sops/:id — detail SOP
router.get('/:id', requireAuth, async (req, res) => {
  try {
    const sop = await SOPDocument.findByPk(req.params.id);
    if (!sop) return res.status(404).json({ detail: 'SOP not found' });
    return res.json(sop);
  } catch (err) {
    return res.status(500).json({ detail: err.message });
  }
});

// POST /api/sops — buat SOP baru
router.post('/', requireAuth, async (req, res) => {
  try {
    const sopData = req.body;
    let file_url = null;

    // Handle file base64
    if (sopData.file_base64) {
      const pdfBuffer = Buffer.from(sopData.file_base64, 'base64');
      const timestamp = new Date().toISOString().replace(/[-:T.Z]/g, '').slice(0, 15);
      const safeCode = (sopData.code || 'SOP').replace(/\//g, '_').replace(/ /g, '_');
      const filename = `${safeCode}_${timestamp}.pdf`;
      const uploadDir = path.join(__dirname, '..', 'uploads');
      if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir, { recursive: true });
      const filePath = path.join(uploadDir, filename);
      fs.writeFileSync(filePath, pdfBuffer);
      file_url = `uploads/${filename}`;
      console.log(`✅ File saved: ${filePath}`);
    }

    const newSOP = await SOPDocument.create({
      id: uuidv4(),
      code: sopData.code,
      title: sopData.title,
      description: sopData.description || '',
      department: sopData.department,
      responsible_person: sopData.responsible_person,
      status: 'draft',
      approval_status: 'pending',
      effective_date: sopData.effective_date,
      expiry_date: sopData.expiry_date || null,
      file_url,
      version: 1,
      created_by: req.user.id,
      tanggal_pembuatan: sopData.tanggal_pembuatan || null,
      tanggal_revisi: sopData.tanggal_revisi || null,
      tanggal_efektif: sopData.tanggal_efektif || null,
      dasar_hukum: sopData.dasar_hukum || null,
      kualifikasi_pelaksana: sopData.kualifikasi_pelaksana || null,
      keterkaitan: sopData.keterkaitan || null,
      peralatan_perlengkapan: sopData.peralatan_perlengkapan || null,
      peringatan: sopData.peringatan || null,
      pencatatan_pendataan: sopData.pencatatan_pendataan || null,
      maksud: sopData.maksud || null,
      tujuan: sopData.tujuan || null,
      flowchart_steps: sopData.flowchart_steps || null,
      pelaksana_columns: sopData.pelaksana_columns || null,
    });

    // Auto-create revision untuk SOP baru
    await SOPRevision.create({
      id: uuidv4(),
      sop_id: newSOP.id,
      title: `SOP Baru: ${newSOP.title}`,
      version: 1,
      changes_description: 'SOP baru dibuat dan menunggu persetujuan',
      revision_type: 'create',
      status: 'menunggu_persetujuan',
      revised_by: req.user.id,
      revision_date: new Date(),
      new_data: { code: newSOP.code, title: newSOP.title, department: newSOP.department },
    });

    await logActivity(req.user.id, newSOP.id, 'CREATE', `Created SOP: ${newSOP.code} (Pending Approval)`);

    console.log(`✅ SOP created: ${newSOP.code}`);
    return res.status(201).json({ message: 'SOP created', sop: newSOP });
  } catch (err) {
    console.error('❌ Create SOP error:', err);
    return res.status(500).json({ detail: err.message });
  }
});

// PUT /api/sops/:id — update SOP
router.put('/:id', requireAuth, requireRole(['admin', 'kepala_bagian']), async (req, res) => {
  try {
    const sop = await SOPDocument.findByPk(req.params.id);
    if (!sop) return res.status(404).json({ detail: 'SOP not found' });

    const oldData = { title: sop.title, description: sop.description, department: sop.department, responsible_person: sop.responsible_person, status: sop.status };

    const allowedFields = ['title', 'description', 'department', 'responsible_person', 'status', 'effective_date', 'expiry_date'];
    const updates = {};
    allowedFields.forEach(f => { if (req.body[f] !== undefined) updates[f] = req.body[f]; });
    updates.approval_status = 'pending';
    updates.updated_by = req.user.id;

    await sop.update(updates);

    const newData = { title: sop.title, description: sop.description, department: sop.department, responsible_person: sop.responsible_person, status: sop.status };

    await SOPRevision.create({
      id: uuidv4(),
      sop_id: sop.id,
      title: `Update: ${sop.title}`,
      version: sop.version + 1,
      changes_description: 'SOP diperbarui dan menunggu persetujuan',
      revision_type: 'update',
      status: 'menunggu_persetujuan',
      revised_by: req.user.id,
      revision_date: new Date(),
      old_data: oldData,
      new_data: newData,
    });

    await logActivity(req.user.id, sop.id, 'UPDATE', `Updated SOP: ${sop.title} (Pending Approval)`);
    return res.json(sop);
  } catch (err) {
    return res.status(500).json({ detail: err.message });
  }
});

// DELETE /api/sops/:id — hapus SOP (admin only)
router.delete('/:id', requireAuth, requireRole(['admin']), async (req, res) => {
  try {
    const sop = await SOPDocument.findByPk(req.params.id);
    if (!sop) return res.status(404).json({ detail: 'SOP not found' });

    await logActivity(req.user.id, sop.id, 'DELETE', `Deleted SOP: ${sop.title}`);
    await sop.destroy();
    return res.json({ message: 'SOP deleted successfully' });
  } catch (err) {
    return res.status(500).json({ detail: err.message });
  }
});

// GET /api/sops/:id/download — download PDF
router.get('/:id/download', requireAuth, async (req, res) => {
  try {
    const sop = await SOPDocument.findByPk(req.params.id);
    if (!sop) return res.status(404).json({ detail: 'SOP tidak ditemukan' });
    if (!sop.file_url) return res.status(404).json({ detail: 'File PDF tidak tersedia. Silakan upload ulang SOP.' });

    const possiblePaths = [
      sop.file_url,
      path.join(__dirname, '..', sop.file_url),
      path.join(__dirname, '..', 'uploads', path.basename(sop.file_url)),
    ];

    for (const p of possiblePaths) {
      if (fs.existsSync(p)) {
        return res.sendFile(path.resolve(p), {
          headers: { 'Content-Type': 'application/pdf', 'Content-Disposition': `inline; filename="${sop.code}.pdf"` }
        });
      }
    }

    return res.status(404).json({ detail: `File tidak ditemukan: ${sop.file_url}` });
  } catch (err) {
    return res.status(500).json({ detail: err.message });
  }
});

// PUT /api/sops/:id/approve — approve SOP
router.put('/:id/approve', requireAuth, requireRole(['admin', 'kepala_bagian']), async (req, res) => {
  try {
    const sop = await SOPDocument.findByPk(req.params.id);
    if (!sop) return res.status(404).json({ detail: 'SOP not found' });

    await sop.update({ approval_status: 'approved', status: 'aktif', approved_by: req.user.id });
    await logActivity(req.user.id, sop.id, 'APPROVE', `Approved SOP: ${sop.title}`);
    return res.json({ message: 'SOP approved successfully', sop });
  } catch (err) {
    return res.status(500).json({ detail: err.message });
  }
});

// PUT /api/sops/:id/reject — reject SOP
router.put('/:id/reject', requireAuth, requireRole(['admin', 'kepala_bagian']), async (req, res) => {
  try {
    const sop = await SOPDocument.findByPk(req.params.id);
    if (!sop) return res.status(404).json({ detail: 'SOP not found' });

    const { rejection_reason } = req.body;
    if (!rejection_reason) return res.status(400).json({ detail: 'Rejection reason is required' });

    await sop.update({ approval_status: 'rejected', approved_by: req.user.id });
    await logActivity(req.user.id, sop.id, 'REJECT', `Rejected SOP: ${sop.title} - Reason: ${rejection_reason}`);
    return res.json({ message: 'SOP rejected', sop });
  } catch (err) {
    return res.status(500).json({ detail: err.message });
  }
});

module.exports = router;
