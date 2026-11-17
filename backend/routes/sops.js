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
    } else if (file_url) {
      // Jika ada file_url (misal copy / duplicate), gandakan file fisik agar independen
      const possibleSrcPaths = [
        path.join(__dirname, '..', file_url),
        path.join(__dirname, '..', 'uploads', path.basename(file_url)),
      ];
      const foundSrc = possibleSrcPaths.find(p => fs.existsSync(p));
      if (foundSrc) {
        const timestamp = new Date().toISOString().replace(/[-:T.Z]/g, '').slice(0, 15);
        const safeCode = (sopData.code || 'SOP').replace(/[\/\\ ]/g, '_');
        const ext = path.extname(foundSrc) || '.pdf';
        const newFilename = `${safeCode}_${timestamp}${ext}`;
        const uploadDir = path.join(__dirname, '..', 'uploads');
        if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir, { recursive: true });
        const destPath = path.join(uploadDir, newFilename);
        try {
          fs.copyFileSync(foundSrc, destPath);
          file_url = `uploads/${newFilename}`;
        } catch (e) {
          console.warn('⚠️ Gagal menduplikasi file fisik:', e.message);
        }
      }
    }

    let flowchartSteps = sopData.flowchart_steps;
    if (typeof flowchartSteps === 'string') {
      try { flowchartSteps = JSON.parse(flowchartSteps); } catch {}
    }
    let pelaksanaColumns = sopData.pelaksana_columns;
    if (typeof pelaksanaColumns === 'string') {
      try { pelaksanaColumns = JSON.parse(pelaksanaColumns); } catch {}
    }

    // Tentukan apakah bertipe manual upload PDF atau generate form
    let is_manual = false;
    if (sopData.is_manual !== undefined) {
      is_manual = Boolean(sopData.is_manual);
    } else if (flowchartSteps && Array.isArray(flowchartSteps) && flowchartSteps.length > 0) {
      is_manual = false;
    } else if (sopData.file_base64 || file_url) {
      is_manual = true;
    }

    const newSOP = await SOPDocument.create({
      id: uuidv4(),
      code: sopData.code,
      title: sopData.title,
      description: sopData.description || '',
      department: sopData.department || req.user.department || 'Umum',
      responsible_person: sopData.responsible_person || req.user.full_name,
      status: isHigherRole ? (sopData.status || initialStatus) : 'draft',
      approval_status: initialApprovalStatus,
      effective_date: sopData.effective_date || new Date().toISOString().slice(0, 10),
      expiry_date: sopData.expiry_date || null,
      file_url,
      version: 1,
      is_manual,
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
    const isSameDept = req.user.department && sop.department && (
      req.user.department.toLowerCase().trim() === sop.department.toLowerCase().trim()
    );
    if (!isHigherRole && !isOwner && !isSameDept) {
      return res.status(403).json({ detail: 'Anda hanya memiliki akses mengedit SOP milik Anda sendiri atau tim Anda.' });
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
      'flowchart_steps', 'pelaksana_columns', 'file_url', 'is_manual'
    ];
    const updates = {};
    allowedFields.forEach(f => { if (req.body[f] !== undefined) updates[f] = req.body[f]; });

    // Handle update file base64 (bisa dari req.body.file_base64 atau data URI di req.body.file_url)
    let incomingBase64 = req.body.file_base64;
    if (!incomingBase64 && typeof req.body.file_url === 'string' && req.body.file_url.startsWith('data:')) {
      incomingBase64 = req.body.file_url.split(',')[1];
    }

    const isCurrentlyManual = Boolean(sop.is_manual);

    // Aturan 1 & 2:
    // - Jika file upload manual kemudian update ke generate pdf maka TIDAK BISA dan harus upload pdf
    if (isCurrentlyManual) {
      const hasFlowchart = req.body.flowchart_steps !== undefined &&
        req.body.flowchart_steps !== null &&
        req.body.flowchart_steps !== 'null' &&
        req.body.flowchart_steps !== '[]' &&
        (Array.isArray(req.body.flowchart_steps) ? req.body.flowchart_steps.length > 0 : true);

      if (req.body.is_manual === false || hasFlowchart) {
        return res.status(400).json({
          detail: 'Dokumen ini bertipe Upload PDF manual dan tidak dapat diubah menjadi generate PDF form/flowchart. Silakan perbarui dengan mengunggah berkas PDF manual baru.'
        });
      }
      updates.is_manual = true;
      updates.flowchart_steps = null;
      updates.pelaksana_columns = null;
    } else {
      // Dokumen saat ini adalah generate PDF:
      // - Jika diganti dengan Upload PDF manual, maka yang dipakai adalah PDF manual dan status berubah jadi manual
      // - Jika diupdate dengan generate pdf, tetap generate pdf
      const isSwitchingToManual = req.body.is_manual === true || (incomingBase64 && req.body.flowchart_steps === undefined);
      if (isSwitchingToManual) {
        updates.is_manual = true;
        updates.flowchart_steps = null;
        updates.pelaksana_columns = null;
        console.log(`🔄 SOP ${sop.code} beralih dari Form Generate ke Upload PDF Manual.`);
      } else {
        updates.is_manual = false;
      }
    }

    if (incomingBase64) {
      const pdfBuffer = Buffer.from(incomingBase64, 'base64');
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

    // Fungsionalitas Admin Absolute:
    // Ketika Admin / Kepala Bagian merevisi dokumen, langsung otomatis 'approved' dan 'aktif' tanpa menunggu persetujuan!
    if (isHigherRole) {
      updates.approval_status = 'approved';
      updates.status = req.body.status || 'aktif';
      updates.approved_by = req.user.id;
    } else {
      updates.approval_status = 'pending';
      updates.status = 'draft';
    }
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
      changes_description: isHigherRole
        ? 'SOP diperbarui dan langsung disetujui (Admin Absolute)'
        : 'SOP diperbarui dan menunggu persetujuan',
      revision_type: 'update',
      status: isHigherRole ? 'disetujui' : 'menunggu_persetujuan',
      revised_by: req.user.id,
      reviewed_by: isHigherRole ? req.user.id : null,
      approval_date: isHigherRole ? new Date() : null,
      revision_date: new Date(),
      old_data: oldData,
      new_data: newData,
    });

    const actionLabel = isHigherRole ? 'UPDATE_APPROVED' : 'UPDATE';
    const desc = isHigherRole
      ? `Admin ${req.user.full_name || req.user.email} merevisi & langsung menyetujui: ${sop.title}`
      : `Updated SOP: ${sop.title} (Pending Approval)`;
    await logActivity(req.user.id, sop.id, actionLabel, desc);

    console.log(`✅ SOP updated: ${sop.code} [${updates.approval_status}] by ${req.user.email}`);
    return res.json(sop);
  } catch (err) {
    console.error('❌ Update SOP error:', err);
    return res.status(500).json({ detail: err.message });
  }
});

// POST /api/sops/:id/duplicate — Duplikasi SOP beserta berkas dokumen PDF fisik
router.post('/:id/duplicate', requireAuth, async (req, res) => {
  try {
    const originalSop = await SOPDocument.findByPk(req.params.id);
    if (!originalSop) return res.status(404).json({ detail: 'SOP asli tidak ditemukan' });

    const newYear = req.body.new_year ? String(req.body.new_year).trim() : String(new Date().getFullYear() + 1);

    // Siapkan kode unik baru
    let newCode = req.body.code || (originalSop.code ? originalSop.code.replace(/\d{4}/g, newYear) : `${originalSop.code || 'SOP'}-${newYear}`);
    if (newCode === originalSop.code) {
      newCode = `${newCode}-${newYear}`;
    }

    // Pastikan kode unik di DB, jika bentrok beri penanda unik
    let existingCode = await SOPDocument.findOne({ where: { code: newCode } });
    let counter = 1;
    let baseCode = newCode;
    while (existingCode) {
      newCode = `${baseCode}_DUP${counter > 1 ? counter : ''}`;
      existingCode = await SOPDocument.findOne({ where: { code: newCode } });
      counter++;
    }

    // Judul & deskripsi baru
    const newTitle = req.body.title || (originalSop.title ? (originalSop.title.includes(newYear) ? originalSop.title : originalSop.title.replace(/\d{4}/g, newYear)) : `Duplikat ${originalSop.title}`);
    const newDescription = originalSop.description ? originalSop.description.replace(/\d{4}/g, newYear) : '';

    // Tanggal baru
    const newEffectiveDate = originalSop.effective_date ? originalSop.effective_date.replace(/^\d{4}/, newYear) : new Date().toISOString().slice(0, 10);
    const newExpiryDate = originalSop.expiry_date ? originalSop.expiry_date.replace(/^\d{4}/, newYear) : null;
    const newTanggalEfektif = originalSop.tanggal_efektif ? originalSop.tanggal_efektif.replace(/^\d{4}/, newYear) : null;

    // Duplikasi berkas fisik PDF (dokumen)
    let newFileUrl = null;
    if (originalSop.file_url) {
      const uploadDir = path.join(__dirname, '..', 'uploads');
      if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir, { recursive: true });

      const possibleSrcPaths = [
        path.join(__dirname, '..', originalSop.file_url),
        path.join(uploadDir, path.basename(originalSop.file_url)),
        originalSop.file_url,
      ];

      let foundPath = possibleSrcPaths.find(p => fs.existsSync(p));
      if (foundPath) {
        const timestamp = new Date().toISOString().replace(/[-:T.Z]/g, '').slice(0, 15);
        const safeCode = newCode.replace(/[\/\\ ]/g, '_');
        const ext = path.extname(foundPath) || '.pdf';
        const newFilename = `${safeCode}_${timestamp}${ext}`;
        const destPath = path.join(uploadDir, newFilename);

        try {
          fs.copyFileSync(foundPath, destPath);
          newFileUrl = `uploads/${newFilename}`;
          console.log(`📋 Dokumen fisik PDF berhasil diduplikasi: ${newFileUrl}`);
        } catch (copyErr) {
          console.warn('⚠️ Gagal copy file fisik:', copyErr.message);
          newFileUrl = originalSop.file_url;
        }
      } else {
        newFileUrl = originalSop.file_url;
      }
    }

    // Buat record SOP duplikat baru dengan seluruh COP & Flowchart lengkap
    const newSOP = await SOPDocument.create({
      id: uuidv4(),
      code: newCode,
      title: newTitle,
      description: newDescription,
      department: originalSop.department,
      responsible_person: originalSop.responsible_person,
      status: 'draft',
      approval_status: 'pending',
      effective_date: newEffectiveDate,
      expiry_date: newExpiryDate,
      version: 1,
      is_manual: Boolean(originalSop.is_manual),
      file_url: newFileUrl,
      created_by: req.user.id,
      approved_by: null,
      tanggal_pembuatan: originalSop.tanggal_pembuatan || null,
      tanggal_revisi: null,
      tanggal_efektif: newTanggalEfektif,
      dasar_hukum: originalSop.dasar_hukum,
      kualifikasi_pelaksana: originalSop.kualifikasi_pelaksana,
      keterkaitan: originalSop.keterkaitan,
      peralatan_perlengkapan: originalSop.peralatan_perlengkapan,
      peringatan: originalSop.peringatan,
      pencatatan_pendataan: originalSop.pencatatan_pendataan,
      maksud: originalSop.maksud,
      tujuan: originalSop.tujuan,
      flowchart_steps: originalSop.flowchart_steps,
      pelaksana_columns: originalSop.pelaksana_columns,
    });

    // Buat revision riwayat duplikasi
    await SOPRevision.create({
      id: uuidv4(),
      sop_id: newSOP.id,
      title: `Duplikasi dari SOP: ${originalSop.code}`,
      version: 1,
      changes_description: `Diduplikasi dari ${originalSop.code} (${originalSop.title}) untuk tahun ${newYear}`,
      revision_type: 'duplicate',
      status: 'menunggu_persetujuan',
      revised_by: req.user.id,
      revision_date: new Date(),
      new_data: { code: newSOP.code, title: newSOP.title, department: newSOP.department },
    });

    await logActivity(req.user.id, newSOP.id, 'DUPLICATE', `Duplicated SOP: ${originalSop.code} → ${newSOP.code}`);
    console.log(`✅ SOP duplicated successfully: ${originalSop.code} → ${newSOP.code}`);

    return res.status(201).json({
      message: 'SOP dan dokumen PDF berhasil diduplikasi',
      sop: newSOP,
      ...newSOP.toJSON(),
    });
  } catch (err) {
    console.error('❌ Duplicate SOP error:', err);
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

    // Hanya pembuat, rekan satu tim, atau admin/kepala_bagian yang bisa mengajukan revisi ulang
    const isOwner = !sop.created_by || sop.created_by === req.user.id;
    const isHigherRole = ['admin', 'kepala_bagian'].includes(req.user.role);
    const isSameDept = req.user.department && sop.department && (
      req.user.department.toLowerCase().trim() === sop.department.toLowerCase().trim()
    );
    if (!isOwner && !isHigherRole && !isSameDept) {
      return res.status(403).json({ detail: 'Anda tidak memiliki akses untuk mengajukan revisi ulang SOP ini.' });
    }

    // SOP yang statusnya rejected, draft, atau pending dapat diajukan revisi ulang
    if (sop.approval_status !== 'rejected' && sop.status !== 'draft' && sop.approval_status !== 'pending') {
      return res.status(400).json({ detail: 'Hanya SOP yang ditolak (rejected) atau draft yang dapat diajukan revisi ulang.' });
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

