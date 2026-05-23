const bcrypt = require('bcryptjs');
const { v4: uuidv4 } = require('uuid');
const { User, sequelize } = require('./models');

async function seedAdmin() {
  try {
    // 1. Sinkronkan model dengan DB (pastikan tabel ada)
    await sequelize.sync();
    console.log('🔄 Database synced...');

    const adminEmail = 'admin@bps-surabaya.go.id';
    
    // 2. Cek apakah admin sudah ada
    const existing = await User.findOne({ where: { email: adminEmail } });
    if (existing) {
      console.log('⚠️ Admin already exists. Updating password...');
      const salt = await bcrypt.genSalt(12);
      const password_hash = await bcrypt.hash('Sby123456', salt);
      await existing.update({ password_hash });
      console.log('✅ Admin password updated!');
      process.exit(0);
    }

    // 3. Buat admin baru
    const salt = await bcrypt.genSalt(12);
    const password_hash = await bcrypt.hash('Sby123456', salt);

    await User.create({
      id: uuidv4(),
      email: adminEmail,
      full_name: 'Super Admin BPS',
      password_hash: password_hash,
      role: 'admin',
      department: 'Sistem Informasi',
      is_active: true,
      join_date: new Date()
    });

    console.log('✅ Admin injected successfully!');
    console.log('📧 Email: ' + adminEmail);
    console.log('🔑 Password: Sby123456');
    process.exit(0);
  } catch (err) {
    console.error('❌ Error seeding admin:', err);
    process.exit(1);
  }
}

seedAdmin();
