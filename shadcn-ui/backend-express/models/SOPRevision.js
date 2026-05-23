const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const SOPRevision = sequelize.define('SOPRevision', {
  id: {
    type: DataTypes.STRING(36),
    primaryKey: true,
    defaultValue: () => require('uuid').v4(),
  },
  sop_id: {
    type: DataTypes.STRING(36),
    allowNull: false,
  },
  title: {
    type: DataTypes.STRING(500),
    allowNull: false,
  },
  version: {
    type: DataTypes.INTEGER,
    allowNull: false,
  },
  changes_description: {
    type: DataTypes.TEXT('long'),
    allowNull: false,
  },
  revision_type: {
    type: DataTypes.STRING(50),
    allowNull: false,
    defaultValue: 'update',
  },
  status: {
    type: DataTypes.STRING(100),
    allowNull: false,
    defaultValue: 'menunggu_persetujuan',
  },
  revised_by: {
    type: DataTypes.STRING(36),
    allowNull: false,
  },
  reviewed_by: {
    type: DataTypes.STRING(36),
  },
  revision_date: {
    type: DataTypes.DATE,
    defaultValue: DataTypes.NOW,
  },
  approval_date: {
    type: DataTypes.DATE,
  },
  review_notes: {
    type: DataTypes.TEXT('long'),
  },
  old_data: {
    type: DataTypes.JSON,
  },
  new_data: {
    type: DataTypes.JSON,
  },
}, {
  tableName: 'sop_revisions',
  timestamps: true,
  createdAt: 'created_at',
  updatedAt: 'updated_at',
  charset: 'utf8mb4',
  collate: 'utf8mb4_unicode_ci',
});

module.exports = SOPRevision;
