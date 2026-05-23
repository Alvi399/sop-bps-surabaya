const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const User = sequelize.define('User', {
  id: {
    type: DataTypes.STRING(36),
    primaryKey: true,
    defaultValue: () => require('uuid').v4(),
  },
  email: {
    type: DataTypes.STRING(255),
    allowNull: false,
    unique: true,
  },
  password_hash: {
    type: DataTypes.STRING(255),
    allowNull: false,
  },
  full_name: {
    type: DataTypes.STRING(255),
    allowNull: false,
  },
  role: {
    type: DataTypes.STRING(50),
    allowNull: false,
    defaultValue: 'staf',
  },
  department: {
    type: DataTypes.STRING(255),
  },
  phone: {
    type: DataTypes.STRING(50),
  },
  avatar_url: {
    type: DataTypes.STRING(500),
  },
  is_active: {
    type: DataTypes.BOOLEAN,
    defaultValue: true,
  },
  join_date: {
    type: DataTypes.DATEONLY,
    defaultValue: DataTypes.NOW,
  },
  last_login: {
    type: DataTypes.DATE,
  },
}, {
  tableName: 'users',
  timestamps: true,
  createdAt: 'created_at',
  updatedAt: false,
  charset: 'utf8mb4',
  collate: 'utf8mb4_unicode_ci',
});

module.exports = User;
