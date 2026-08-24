const bcrypt = require('bcryptjs');
const { v4: uuidv4 } = require('uuid');
const { User, sequelize } = require('./models');

const defaultUsers = [
  {
    email: 'admin@bps-surabaya.go.id',
    full_name: 'Super Admin BPS',
    role: 'admin',
    department: 'Sistem Informasi',
  },
  {
    email: 'alvikirana138@bps-surabaya.go.id',
    full_name: 'Muhammad Alvi Kirana Zulfan Nazal',
    role: 'admin',
    department: 'Humas, Pojok Statistik dan PSS',
  },
  {
    email: 'kepala@bps-surabaya.go.id',
    full_name: 'Kepala Bagian',
    role: 'kepala_bagian',
    department: 'Pimpinan',
  },
  {
    email: 'tim_umum@bps-surabaya.go.id',
    full_name: 'Ketua Tim Umum',
    role: 'ketua_tim',
    department: 'Umum',
  },
  {
    email: 'atha@bps-surabaya.go.id',
    full_name: 'Atha',
    role: 'staf',
    department: 'SAKIP, ZI dan EPSS',
  },
];

async function seedAllUsers() {
  try {
    await sequelize.sync();
    console.log('🔄 Database synced...');

    const salt = await bcrypt.genSalt(12);
    const password_hash = await bcrypt.hash('Sby123456', salt);

    for (const u of defaultUsers) {
      const existing = await User.findOne({ where: { email: u.email } });
      if (existing) {
        await existing.update({
          password_hash,
          role: u.role,
          full_name: u.full_name,
          department: u.department,
          is_active: true,
        });
        console.log(`✅ User updated: ${u.email} (${u.role})`);
      } else {
        await User.create({
          id: uuidv4(),
          email: u.email,
          full_name: u.full_name,
          password_hash: password_hash,
          role: u.role,
          department: u.department,
          is_active: true,
          join_date: new Date(),
        });
        console.log(`✅ User created: ${u.email} (${u.role})`);
      }
    }

    console.log('\n🎉 Semuan akun (Admin, Kepala, Staf) berhasil dimasukkan ke Database!');
    console.log('🔑 Password default untuk semua akun: Sby123456\n');
    process.exit(0);
  } catch (err) {
    console.error('❌ Error seeding users:', err);
    process.exit(1);
  }
}

seedAllUsers();
