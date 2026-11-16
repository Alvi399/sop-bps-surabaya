const { Sequelize } = require('sequelize');
require('dotenv').config();

const sequelize = new Sequelize(
  process.env.DB_NAME || 'u301139053_sop_bps',
  process.env.DB_USER || 'u301139053_sop_bps_user',
  process.env.DB_PASS || process.env.DB_PASSWORD || '\\Sukasuka2',
  {
    host: process.env.DB_HOST || '153.92.15.58',
    port: parseInt(process.env.DB_PORT) || 3306,
    dialect: 'mysql',
    dialectOptions: {
      charset: 'utf8mb4',
    },
    define: {
      charset: 'utf8mb4',
      collate: 'utf8mb4_unicode_ci',
    },
    pool: {
      max: 10,
      min: 0,
      acquire: 30000,
      idle: 10000,
      evict: 3600000, // Recycle koneksi setiap 1 jam
    },
    logging: false, // Set ke console.log untuk debug query
  }
);

module.exports = sequelize;
