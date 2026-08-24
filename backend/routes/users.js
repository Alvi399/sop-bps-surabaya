const express = require('express');
const bcrypt = require('bcryptjs');
const { User, ActivityLog } = require('../models');
const { requireAuth, requireRole } = require('../middleware/auth');

const router = express.Router();

// GET /api/users — semua user
router.get('/', requireAuth, async (req, res) => {
  try {
    const users = await User.findAll({ attributes: { exclude: ['password_hash'] } });
    return res.json(users);
  } catch (err) {
    return res.status(500).json({ detail: err.message });
  }
});

// GET /api/users/me — profil user yang sedang login
router.get('/me', requireAuth, (req, res) => {
  const user = req.user.toJSON();
  delete user.password_hash;
  return res.json(user);
});

// PUT /api/users/me — update profil
router.put('/me', requireAuth, async (req, res) => {
  try {
    const { full_name, email, phone, department } = req.body;

    if (email) {
      const existing = await User.findOne({
        where: { email },
      });
      if (existing && existing.id !== req.user.id) {
        return res.status(400).json({ detail: 'Email sudah digunakan oleh akun lain' });
      }
    }

    const updates = {};
    if (full_name !== undefined) updates.full_name = full_name;
    if (email !== undefined) updates.email = email;
    if (phone !== undefined) updates.phone = phone;
    if (department !== undefined) updates.department = department;

    await req.user.update(updates);
    const user = req.user.toJSON();
    delete user.password_hash;

    return res.json({ message: 'Profil berhasil diperbarui', user });
  } catch (err) {
    return res.status(500).json({ detail: err.message });
  }
});

// PUT /api/users/me/avatar — update avatar foto profil
router.put('/me/avatar', requireAuth, async (req, res) => {
  try {
    const { avatar_url } = req.body;
    await req.user.update({ avatar_url: avatar_url || '' });
    
    const user = req.user.toJSON();
    delete user.password_hash;

    return res.json({
      message: 'Foto profil berhasil diperbarui',
      avatar_url: req.user.avatar_url,
      user
    });
  } catch (err) {
    console.error('Error updating avatar:', err);
    return res.status(500).json({ detail: err.message });
  }
});


router.put('/me/password', requireAuth, async (req, res) => {
  try {
    const { current_password, new_password } = req.body;

    if (!current_password || !new_password) {
      return res.status(400).json({ detail: 'Password lama dan baru wajib diisi' });
    }

    const isValid = await bcrypt.compare(current_password, req.user.password_hash);
    if (!isValid) {
      return res.status(400).json({ detail: 'Password saat ini salah' });
    }

    const salt = await bcrypt.genSalt(12);
    const password_hash = await bcrypt.hash(new_password, salt);
    await req.user.update({ password_hash });

    return res.json({ message: 'Password berhasil diperbarui' });
  } catch (err) {
    return res.status(500).json({ detail: err.message });
  }
});

// GET /api/users/:id — detail user by ID
router.get('/:id', requireAuth, async (req, res) => {
  try {
    const user = await User.findByPk(req.params.id, { attributes: { exclude: ['password_hash'] } });
    if (!user) return res.status(404).json({ detail: 'User tidak ditemukan' });
    return res.json(user);
  } catch (err) {
    return res.status(500).json({ detail: err.message });
  }
});

module.exports = router;
