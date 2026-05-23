const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { PDFDocument, rgb } = require('pdf-lib');
const { requireAuth } = require('../middleware/auth');

const router = express.Router();

const upload = multer({ storage: multer.memoryStorage() });

// GET /pdfs/:filename — serve file PDF statis
router.get('/pdfs/:filename', async (req, res) => {
  try {
    const filename = req.params.filename;
    const filePath = path.join(__dirname, '..', 'uploads', filename);

    if (!fs.existsSync(filePath)) {
      return res.status(404).json({ detail: 'File not found' });
    }

    return res.sendFile(path.resolve(filePath), {
      headers: { 'Content-Type': 'application/pdf' }
    });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
});

// POST /edit-pdf/ — edit teks PDF (cari & ganti teks)
// Catatan: pdf-lib tidak bisa cari teks seperti PyMuPDF.
// Implementasi ini menyediakan endpoint kompatibel yang mengembalikan PDF asli dengan anotasi.
// Untuk full text-replace, gunakan library tambahan seperti hummus-recipe atau pdf2pic.
router.post('/edit-pdf/', upload.single('file'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'File PDF diperlukan' });
    }

    const { old_text, new_text } = req.body;
    if (!old_text || !new_text) {
      return res.status(400).json({ error: 'old_text dan new_text diperlukan' });
    }

    // Load PDF dengan pdf-lib
    const pdfDoc = await PDFDocument.load(req.file.buffer);
    const pages = pdfDoc.getPages();

    // pdf-lib tidak support text search/replace secara native.
    // Kita tambahkan anotasi sebagai marker bahwa penggantian teks diminta.
    // Untuk implementasi penuh, integrasikan dengan layanan eksternal atau gunakan ghostscript.
    const page = pages[0];
    const { width, height } = page.getSize();

    page.drawText(`[Revisi: "${old_text}" → "${new_text}"]`, {
      x: 10,
      y: height - 20,
      size: 8,
      color: rgb(0.8, 0, 0),
    });

    const pdfBytes = await pdfDoc.save();

    // Simpan file hasil edit
    const timestamp = Date.now();
    const revisedFilename = `revised_${timestamp}_${req.file.originalname}`;
    const uploadDir = path.join(__dirname, '..', 'uploads');
    if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir, { recursive: true });
    const outputPath = path.join(uploadDir, revisedFilename);
    fs.writeFileSync(outputPath, pdfBytes);

    return res.sendFile(path.resolve(outputPath), {
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="${revisedFilename}"`,
      }
    });
  } catch (err) {
    console.error('❌ Edit PDF error:', err);
    return res.status(500).json({ error: err.message });
  }
});

module.exports = router;
