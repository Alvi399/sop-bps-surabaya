const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const SOPDocument = sequelize.define('SOPDocument', {
  id: {
    type: DataTypes.STRING(36),
    primaryKey: true,
    defaultValue: () => require('uuid').v4(),
  },
  code: {
    type: DataTypes.STRING(100),
    allowNull: false,
    unique: true,
  },
  title: {
    type: DataTypes.STRING(500),
    allowNull: false,
  },
  description: {
    type: DataTypes.TEXT('long'), // LONGTEXT
  },
  department: {
    type: DataTypes.STRING(255),
    allowNull: false,
  },
  responsible_person: {
    type: DataTypes.STRING(255),
    allowNull: false,
  },
  status: {
    type: DataTypes.STRING(50),
    allowNull: false,
    defaultValue: 'draft',
  },
  approval_status: {
    type: DataTypes.STRING(50),
    allowNull: false,
    defaultValue: 'pending',
  },
  effective_date: {
    type: DataTypes.DATEONLY,
    allowNull: false,
  },
  expiry_date: {
    type: DataTypes.DATEONLY,
  },
  version: {
    type: DataTypes.INTEGER,
    defaultValue: 1,
  },
  file_url: {
    type: DataTypes.TEXT,
  },
  created_by: {
    type: DataTypes.STRING(36),
    allowNull: false,
  },
  approved_by: {
    type: DataTypes.STRING(36),
  },
  updated_by: {
    type: DataTypes.STRING(36),
  },
  // COP Fields
  tanggal_pembuatan: { type: DataTypes.DATEONLY },
  tanggal_revisi:    { type: DataTypes.DATEONLY },
  tanggal_efektif:   { type: DataTypes.DATEONLY },
  dasar_hukum:           { type: DataTypes.TEXT('long') },
  kualifikasi_pelaksana: { type: DataTypes.TEXT('long') },
  keterkaitan:           { type: DataTypes.TEXT('long') },
  peralatan_perlengkapan:{ type: DataTypes.TEXT('long') },
  peringatan:            { type: DataTypes.TEXT('long') },
  pencatatan_pendataan:  { type: DataTypes.TEXT('long') },
  maksud:                { type: DataTypes.TEXT('long') },
  tujuan:                { type: DataTypes.TEXT('long') },
  flowchart_steps:   { type: DataTypes.JSON },
  pelaksana_columns: { type: DataTypes.JSON },
}, {
  tableName: 'sop_documents',
  timestamps: true,
  createdAt: 'created_at',
  updatedAt: 'updated_at',
  charset: 'utf8mb4',
  collate: 'utf8mb4_unicode_ci',
});

module.exports = SOPDocument;
