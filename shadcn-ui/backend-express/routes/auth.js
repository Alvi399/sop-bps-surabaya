const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { v4: uuidv4 } = require('uuid');
const { User } = require('../models');
const { requireAuth } = require('../middleware/auth');

const router = express.Router();

// POST /api/auth/register
router.post('/register', async (req, res) => {
  try {
    const { email, password, full_name, department, phone, role } = req.body;

    if (!email || !password || !full_name || !department) {
      return res.status(400).json({ detail: 'Email, password, full_name, dan department wajib diisi' });
    }

    const existing = await User.findOne({ where: { email } });
    if (existing) {
      return res.status(400).json({ detail: 'Email already registered' });
    }

    const salt = await bcrypt.genSalt(12);
    const password_hash = await bcrypt.hash(password, salt);

    const user = await User.create({
      id: uuidv4(),
      email,
      password_hash,
      full_name,
      department,
      phone: phone || null,
      role: role || 'staf',
      is_active: true,
      join_date: new Date(),
    });

    const { password_hash: _, ...userResponse } = user.toJSON();
    return res.status(201).json(userResponse);
  } catch (err) {
    console.error('❌ Register error:', err);
    return res.status(500).json({ detail: err.message });
  }
});

// POST /api/auth/login
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    console.log(`🔐 Login attempt: ${email}`);

    const user = await User.findOne({ where: { email } });
    if (!user) {
      console.log(`❌ User not found: ${email}`);
      return res.status(401).json({ detail: 'Invalid credentials' });
    }

    const isValid = await bcrypt.compare(password, user.password_hash);
    if (!isValid) {
      console.log(`❌ Password invalid untuk: ${email}`);
      return res.status(401).json({ detail: 'Invalid credentials' });
    }

    console.log(`✅ Login berhasil: ${email}`);

    // Update last_login
    await user.update({ last_login: new Date() });

    const token = jwt.sign(
      { id: user.id, email: user.email },
      process.env.JWT_SECRET,
      { expiresIn: process.env.JWT_EXPIRES_IN || '30m' }
    );

    return res.json({
      access_token: token,
      token_type: 'bearer',
      user: {
        id: user.id,
        email: user.email,
        full_name: user.full_name,
        role: user.role,
        department: user.department,
        is_active: user.is_active,
        avatar_url: user.avatar_url,
        phone: user.phone,
        join_date: user.join_date,
        last_login: user.last_login,
      },
    });
  } catch (err) {
    console.error('❌ Login error:', err);
    return res.status(500).json({ detail: err.message });
  }
});

// GET /api/auth/me
router.get('/me', requireAuth, (req, res) => {
  const { password_hash: _, ...userResponse } = req.user.toJSON();
  return res.json(userResponse);
});

module.exports = router;
