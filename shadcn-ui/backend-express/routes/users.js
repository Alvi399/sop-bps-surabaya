const express = require('express');
const bcrypt = require('bcryptjs');
const { User, ActivityLog } = require('../models');
const { requireAuth } = require('../middleware/auth');

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
  const { password_hash: _, ...user } = req.user.toJSON();
  return res.json(user);
});

// PUT /api/users/me — update profil
router.put('/me', requireAuth, async (req, res) => {
  try {
    const { full_name, email, phone } = req.body;

    if (email) {
      const existing = await User.findOne({
        where: { email },
      });
      if (existing && existing.id !== req.user.id) {
        return res.status(400).json({ detail: 'Email already in use' });
      }
    }

    const updates = {};
    if (full_name !== undefined) updates.full_name = full_name;
    if (email !== undefined) updates.email = email;
    if (phone !== undefined) updates.phone = phone;

    await req.user.update(updates);
    const { password_hash: _, ...user } = req.user.toJSON();
    return res.json({ message: 'Profile updated successfully', user });
  } catch (err) {
    return res.status(500).json({ detail: err.message });
  }
});

// PUT /api/users/me/avatar — update avatar
router.put('/me/avatar', requireAuth, async (req, res) => {
  try {
    const { avatar_url } = req.body;
    await req.user.update({ avatar_url: avatar_url || '' });
    return res.json({ message: 'Avatar updated successfully', avatar_url: req.user.avatar_url });
  } catch (err) {
    return res.status(500).json({ detail: err.message });
  }
});

// PUT /api/users/me/password — ganti password
router.put('/me/password', requireAuth, async (req, res) => {
  try {
    const { current_password, new_password } = req.body;

    if (!current_password || !new_password) {
      return res.status(400).json({ detail: 'Both passwords required' });
    }

    const isValid = await bcrypt.compare(current_password, req.user.password_hash);
    if (!isValid) {
      return res.status(400).json({ detail: 'Current password is incorrect' });
    }

    const salt = await bcrypt.genSalt(12);
    const password_hash = await bcrypt.hash(new_password, salt);
    await req.user.update({ password_hash });

    return res.json({ message: 'Password updated successfully' });
  } catch (err) {
    return res.status(500).json({ detail: err.message });
  }
});

// GET /api/users/:id — detail user by ID
router.get('/:id', requireAuth, async (req, res) => {
  try {
    const user = await User.findByPk(req.params.id, { attributes: { exclude: ['password_hash'] } });
    if (!user) return res.status(404).json({ detail: 'User not found' });
    return res.json(user);
  } catch (err) {
    return res.status(500).json({ detail: err.message });
  }
});

module.exports = router;
