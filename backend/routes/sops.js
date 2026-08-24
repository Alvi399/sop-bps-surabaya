const express = require('express');
const { Op } = require('sequelize');
const { v4: uuidv4 } = require('uuid');
const path = require('path');
const fs = require('fs');
const { SOPDocument, SOPRevision, ActivityLog, User } = require('../models');
const { requireAuth, requireRole } = require('../middleware/auth');

const router = express.Router();

// Helper: buat activity log
async function logActivity(user_id, sop_id, action, description) {
  try {
    await ActivityLog.create({ id: uuidv4(), user_id, sop_id, action, description });
  } catch (err) {
    console.error('⚠️ Log activity failed:', err.message);
  }
}

// GET /api/sops — semua SOP
router.get('/', requireAuth, async (req, res) => {
  try {
    const { skip = 0, limit = 100 } = req.query;
    const sops = await SOPDocument.findAll({
      order: [['updated_at', 'DESC']],
      offset: parseInt(skip),
      limit: parseInt(limit),
      include: [
        {
          model: User,
          as: 'creator',
          attributes: ['id', 'full_name', 'email', 'role', 'department'],
        },
      ],
    });
    return res.json(sops);
  } catch (err) {
    console.error('Error fetching SOPs:', err);
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
          { department: { [Op.like]: `%${query}%` } },
        ],
      },
      include: [
        {
          model: User,
          as: 'creator',
          attributes: ['id', 'full_name', 'email', 'role', 'department'],
        },
      ],
    });
    return res.json(sops);
  } catch (err) {
    return res.status(500).json({ detail: err.message });
  }
});

// GET /api/sops/:id — detail SOP
router.get('/:id', requireAuth, async (req, res) => {
  try {
    const sop = await SOPDocument.findByPk(req.params.id, {
      include: [
        {
          model: User,
          as: 'creator',
          attributes: ['id', 'full_name', 'email', 'role', 'department'],
        },
        {
          model: SOPRevision,
          as: 'revisions',
          include: [
            {
              model: User,
              as: 'reviser',
              attributes: ['id', 'full_name', 'email'],
            },
          ],
        },
      ],
    });
    if (!sop) return res.status(404).json({ detail: 'SOP tidak ditemukan' });
    return res.json(sop);
  } catch (err) {
    return res.status(500).json({ detail: err.message });
  }
});

// POST /api/sops — buat SOP baru
router.post('/', requireAuth, async (req, res) => {
  try {
    const sopData = req.body;
    if (!sopData.title || !sopData.code) {
      return res.status(400).json({ detail: 'Kode SOP dan Judul SOP wajib diisi' });
    }

    // Tentukan apakah SOP perlu approval atau langsung aktif
    const isHigherRole = ['admin', 'kepala_bagian'].includes(req.user.role);
    const initialStatus = isHigherRole ? 'aktif' : 'draft';
    const initialApprovalStatus = isHigherRole ? 'approved' : 'pending';

    let file_url = sopData.file_url || null;

    // Handle file base64 jika ada
    if (sopData.file_base64) {
      const pdfBuffer = Buffer.from(sopData.file_base64, 'base64');
      const timestamp = new Date().toISOString().replace(/[-:T.Z]/g, '').slice(0, 15);
      const safeCode = (sopData.code || 'SOP').replace(/[\/\\ ]/g, '_');
      const filename = `${safeCode}_${timestamp}.pdf`;
      const uploadDir = path.join(__dirname, '..', 'uploads');
      if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir, { recursive: true });
      const filePath = path.join(uploadDir, filename);
      fs.writeFileSync(filePath, pdfBuffer);
      file_url = `uploads/${filename}`;
    }

    let flowchartSteps = sopData.flowchart_steps;
    if (typeof flowchartSteps === 'string') {
      try { flowchartSteps = JSON.parse(flowchartSteps); } catch {}
    }
    let pelaksanaColumns = sopData.pelaksana_columns;
    if (typeof pelaksanaColumns === 'string') {
      try { pelaksanaColumns = JSON.parse(pelaksanaColumns); } catch {}
    }

    const newSOP = await SOPDocument.create({
      id: uuidv4(),
      code: sopData.code,
      title: sopData.title,
      description: sopData.description || '',
      department: sopData.department || req.user.department || 'Umum',
      responsible_person: sopData.responsible_person || req.user.full_name,
      status: sopData.status || initialStatus,
      approval_status: initialApprovalStatus,
      effective_date: sopData.effective_date || new Date().toISOString().slice(0, 10),
      expiry_date: sopData.expiry_date || null,
      file_url,
      version: 1,
      created_by: req.user.id,
      approved_by: isHigherRole ? req.user.id : null,
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
      flowchart_steps: flowchartSteps || null,
      pelaksana_columns: pelaksanaColumns || null,
    });

    // Auto-create revision awal
    await SOPRevision.create({
      id: uuidv4(),
      sop_id: newSOP.id,
      title: `SOP Baru: ${newSOP.title}`,
      version: 1,
      changes_description: isHigherRole
        ? 'SOP baru dibuat dan langsung diaktifkan oleh Admin/Kepala Bagian'
        : 'SOP baru dibuat dan menunggu persetujuan',
      revision_type: 'create',
      status: isHigherRole ? 'disetujui' : 'menunggu_persetujuan',
      revised_by: req.user.id,
      reviewed_by: isHigherRole ? req.user.id : null,
      approval_date: isHigherRole ? new Date() : null,
      revision_date: new Date(),
      new_data: { code: newSOP.code, title: newSOP.title, department: newSOP.department },
    });

    const actionLabel = isHigherRole ? 'CREATE_APPROVED' : 'CREATE';
    const desc = isHigherRole
      ? `Created & Auto-Approved SOP: ${newSOP.code}`
      : `Created SOP: ${newSOP.code} (Pending Approval)`;
    await logActivity(req.user.id, newSOP.id, actionLabel, desc);

    console.log(`✅ SOP created successfully: ${newSOP.code} [${initialApprovalStatus}]`);
    return res.status(201).json({
      message: 'SOP created successfully',
      sop: newSOP,
      ...newSOP.toJSON()
    });
  } catch (err) {
    console.error('❌ Create SOP error:', err);
    return res.status(500).json({ detail: err.message });
  }
});

// PUT /api/sops/:id — update SOP
router.put('/:id', requireAuth, async (req, res) => {
  try {
    const sop = await SOPDocument.findByPk(req.params.id);
    if (!sop) return res.status(404).json({ detail: 'SOP tidak ditemukan' });

    // Pengecekan hak edit: Admin & Kepala Bagian bebas edit; Staf / Ketua Tim hanya SOP milik sendiri atau departemennya
    const isOwner = !sop.created_by || sop.created_by === req.user.id;
    const isHigherRole = ['admin', 'kepala_bagian'].includes(req.user.role);
    if (!isHigherRole && !isOwner) {
      return res.status(403).json({ detail: 'Anda hanya memiliki akses mengedit SOP milik Anda sendiri.' });
    }

    const oldData = {
      title: sop.title,
      description: sop.description,
      department: sop.department,
      responsible_person: sop.responsible_person,
      status: sop.status
    };

    const allowedFields = [
      'code', 'title', 'description', 'department', 'responsible_person', 'status', 'effective_date', 'expiry_date',
      'tanggal_pembuatan', 'tanggal_revisi', 'tanggal_efektif',
      'dasar_hukum', 'kualifikasi_pelaksana', 'keterkaitan', 'peralatan_perlengkapan',
      'peringatan', 'pencatatan_pendataan', 'maksud', 'tujuan',
      'flowchart_steps', 'pelaksana_columns', 'file_url'
    ];
    const updates = {};
    allowedFields.forEach(f => { if (req.body[f] !== undefined) updates[f] = req.body[f]; });

    // Handle update file base64
    if (req.body.file_base64) {
      const pdfBuffer = Buffer.from(req.body.file_base64, 'base64');
      const timestamp = new Date().toISOString().replace(/[-:T.Z]/g, '').slice(0, 15);
      const safeCode = (req.body.code || sop.code || 'SOP').replace(/[\/\\ ]/g, '_');
      const filename = `${safeCode}_${timestamp}.pdf`;
      const uploadDir = path.join(__dirname, '..', 'uploads');
      if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir, { recursive: true });
      const filePath = path.join(uploadDir, filename);
      fs.writeFileSync(filePath, pdfBuffer);
      updates.file_url = `uploads/${filename}`;
    }

    if (updates.flowchart_steps && typeof updates.flowchart_steps === 'string') {
      try { updates.flowchart_steps = JSON.parse(updates.flowchart_steps); } catch {}
    }
    if (updates.pelaksana_columns && typeof updates.pelaksana_columns === 'string') {
      try { updates.pelaksana_columns = JSON.parse(updates.pelaksana_columns); } catch {}
    }

    // Ubah status approval ke pending jika ada perbaikan data utama
    updates.approval_status = 'pending';
    updates.updated_by = req.user.id;

    await sop.update(updates);

    const newData = {
      title: sop.title,
      description: sop.description,
      department: sop.department,
      responsible_person: sop.responsible_person,
      status: sop.status
    };

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
    console.error('❌ Update SOP error:', err);
    return res.status(500).json({ detail: err.message });
  }
});

// DELETE /api/sops/:id — hapus SOP
router.delete('/:id', requireAuth, async (req, res) => {
  try {
    const sop = await SOPDocument.findByPk(req.params.id);
    if (!sop) return res.status(404).json({ detail: 'SOP tidak ditemukan' });

    // Pengecekan Hapus: Admin & Kepala Bagian bebas hapus; Staf / Ketua Tim hanya SOP buatan sendiri
    const isOwner = !sop.created_by || sop.created_by === req.user.id;
    const isHigherRole = ['admin', 'kepala_bagian'].includes(req.user.role);
    if (!isHigherRole && !isOwner) {
      return res.status(403).json({ detail: 'Anda hanya dapat menghapus SOP yang Anda buat sendiri.' });
    }

    // Log & Hapus
    await logActivity(req.user.id, sop.id, 'DELETE', `Deleted SOP: ${sop.title}`);

    // Hapus file fisik jika ada di folder uploads
    if (sop.file_url) {
      const filePath = path.join(__dirname, '..', sop.file_url);
      if (fs.existsSync(filePath)) {
        try { fs.unlinkSync(filePath); } catch {}
      }
    }

    await sop.destroy();
    return res.json({ message: 'SOP deleted successfully' });
  } catch (err) {
    console.error('❌ Delete SOP error:', err);
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

    return res.status(404).json({ detail: `File tidak ditemukan di server: ${sop.file_url}` });
  } catch (err) {
    return res.status(500).json({ detail: err.message });
  }
});

// PUT /api/sops/:id/approve — approve SOP
router.put('/:id/approve', requireAuth, requireRole(['admin', 'kepala_bagian', 'ketua_tim']), async (req, res) => {
  try {
    const sop = await SOPDocument.findByPk(req.params.id);
    if (!sop) return res.status(404).json({ detail: 'SOP tidak ditemukan' });

    await sop.update({ approval_status: 'approved', status: 'aktif', approved_by: req.user.id });
    await logActivity(req.user.id, sop.id, 'APPROVE', `Approved SOP: ${sop.title}`);
    return res.json({ message: 'SOP approved successfully', sop });
  } catch (err) {
    return res.status(500).json({ detail: err.message });
  }
});

// PUT /api/sops/:id/reject — reject SOP
router.put('/:id/reject', requireAuth, requireRole(['admin', 'kepala_bagian', 'ketua_tim']), async (req, res) => {
  try {
    const sop = await SOPDocument.findByPk(req.params.id);
    if (!sop) return res.status(404).json({ detail: 'SOP tidak ditemukan' });

    const reason = req.body.rejection_reason || req.body.reject_reason || req.body.reason || req.body.review_notes || 'Penolakan oleh verifikator';

    await sop.update({ approval_status: 'rejected', status: 'draft', approved_by: req.user.id });
    await logActivity(req.user.id, sop.id, 'REJECT', `Rejected SOP: ${sop.title} - Reason: ${reason}`);
    return res.json({ message: 'SOP rejected successfully', sop, reason });
  } catch (err) {
    return res.status(500).json({ detail: err.message });
  }
});

// PUT /api/sops/:id/request-revision — Staf mengajukan revisi ulang setelah SOP ditolak
// Alur: draft (rejected) → request-revision → pending (menunggu_persetujuan)
router.put('/:id/request-revision', requireAuth, async (req, res) => {
  try {
    const sop = await SOPDocument.findByPk(req.params.id);
    if (!sop) return res.status(404).json({ detail: 'SOP tidak ditemukan' });

    // Hanya pembuat atau admin/kepala_bagian yang bisa mengajukan revisi ulang
    const isOwner = sop.created_by === req.user.id;
    const isHigherRole = ['admin', 'kepala_bagian'].includes(req.user.role);
    if (!isOwner && !isHigherRole) {
      return res.status(403).json({ detail: 'Anda tidak memiliki akses untuk mengajukan revisi ulang SOP ini.' });
    }

    // Hanya SOP yang statusnya rejected/draft yang bisa diajukan revisi ulang
    if (sop.approval_status !== 'rejected' && sop.status !== 'draft') {
      return res.status(400).json({ detail: 'Hanya SOP yang ditolak (rejected) yang dapat diajukan revisi ulang.' });
    }

    const { revision_notes = 'Mengajukan revisi ulang setelah penolakan' } = req.body;

    // Ubah status kembali ke pending
    await sop.update({
      approval_status: 'pending',
      status: 'draft',
      updated_by: req.user.id,
    });

    // Catat revisi baru
    const newRevision = await SOPRevision.create({
      id: uuidv4(),
      sop_id: sop.id,
      title: `Revisi Ulang: ${sop.title}`,
      version: sop.version + 1,
      changes_description: revision_notes,
      revision_type: 'revision',
      status: 'menunggu_persetujuan',
      revised_by: req.user.id,
      revision_date: new Date(),
      new_data: { code: sop.code, title: sop.title, department: sop.department },
    });

    await logActivity(req.user.id, sop.id, 'REQUEST_REVISION', `Mengajukan revisi ulang SOP: ${sop.title}`);

    console.log(`🔄 Revision requested: ${sop.code}`);
    return res.json({
      message: 'Revisi ulang berhasil diajukan. Menunggu persetujuan kembali.',
      sop,
      revision: newRevision,
    });
  } catch (err) {
    console.error('❌ Request revision error:', err);
    return res.status(500).json({ detail: err.message });
  }
});

module.exports = router;

