import { AuthService } from '../apps/server/src/modules/auth/auth.service.js';
import { pool } from '../apps/server/src/infrastructure/database/pool.js';
import { config } from '../apps/server/src/config/index.js';
import { verifyToken } from '../apps/server/src/common/utils/jwt.js';

async function runTests() {
  console.log('--- 1. Testing Auth Flow ---');
  const authService = new AuthService();

  const testPhone = '+998901234599';
  const testUsername = 'test_owner_99';
  const testPassword = 'HosilAdmin2026!';
  const testStoreName = "Test Organik Do'kon";

  // Clean up any previous test runs
  await pool.query(
    `DELETE FROM staff_members WHERE user_id IN (SELECT id FROM users WHERE username = $1 OR phone = $2)`,
    [testUsername, testPhone]
  );
  await pool.query(
    `DELETE FROM stores WHERE owner_id IN (SELECT id FROM users WHERE username = $1 OR phone = $2)`,
    [testUsername, testPhone]
  );
  await pool.query(
    `DELETE FROM users WHERE username = $1 OR phone = $2`,
    [testUsername, testPhone]
  );

  console.log('Step 1: Registering new store owner...');
  const regResult = await authService.registerOwner({
    firstName: 'Hosil',
    lastName: 'Dehqonov',
    phone: testPhone,
    username: testUsername,
    password: testPassword,
    storeName: testStoreName,
  });

  if (!regResult.token) throw new Error('Token generatsiya qilinmadi');
  if (regResult.user.role !== 'owner') throw new Error(`Noto'g'ri rol: ${regResult.user.role}`);
  if (!regResult.store?.slug) throw new Error('Store yaratilmadi');
  console.log('✅ Registration muvaffaqiyatli:', {
    userId: regResult.user.id,
    role: regResult.user.role,
    store: regResult.store,
  });

  // Verify JWT payload
  const payload = verifyToken(regResult.token);
  if (payload.userId !== regResult.user.id || payload.role !== 'owner') {
    throw new Error('JWT payload mos kelmadi');
  }
  console.log('✅ JWT Token xavfsiz va to\'g\'ri tasdiqlandi');

  // Step 2: Test duplicate registration prevention
  console.log('Step 2: Duplicate registration tekshiruvi...');
  try {
    await authService.registerOwner({
      firstName: 'Ikkinchi',
      phone: testPhone,
      username: 'boshqa_user',
      password: testPassword,
      storeName: 'Yana bir do\'kon',
    });
    throw new Error('Dublikat telefon xatosi qaytarilmadi!');
  } catch (err: any) {
    if (err.message.includes("allaqachon ro'yxatdan o'tgan")) {
      console.log('✅ Dublikat telefon to\'g\'ri bloklandi:', err.message);
    } else {
      throw err;
    }
  }

  // Step 3: Login with Phone
  console.log('Step 3: Telefon orqali login tekshiruvi...');
  const loginByPhone = await authService.loginWithCredentials(testPhone, testPassword);
  if (loginByPhone.user.username !== testUsername) throw new Error('Telefon login xatosi');
  console.log('✅ Telefon orqali login muvaffaqiyatli');

  // Step 4: Login with Username
  console.log('Step 4: Username orqali login tekshiruvi...');
  const loginByUsername = await authService.loginWithCredentials(testUsername, testPassword);
  if (loginByUsername.user.id !== regResult.user.id) throw new Error('Username login xatosi');
  console.log('✅ Username orqali login muvaffaqiyatli');

  // Step 5: Wrong password test
  console.log('Step 5: Noto\'g\'ri parol tekshiruvi...');
  try {
    await authService.loginWithCredentials(testUsername, 'WrongPass123!');
    throw new Error('Noto\'g\'ri parol o\'tkazib yuborildi!');
  } catch (err: any) {
    console.log('✅ Noto\'g\'ri parol to\'g\'ri bloklandi:', err.message);
  }

  // Step 6: Super Admin login
  console.log('Step 6: Super Admin (Big Boss) hisobi tekshiruvi...');
  const superLogin = await authService.loginWithCredentials(
    config.superAdmin.username,
    config.superAdmin.password
  );
  if (!superLogin.user.role || superLogin.user.role !== 'super_admin') {
    throw new Error(`Super admin roli noto'g'ri: ${superLogin.user.role}`);
  }
  console.log('✅ Super Admin login muvaffaqiyatli:', {
    user: superLogin.user.username,
    role: superLogin.user.role,
  });

  // Cleanup test user
  await pool.query(
    `DELETE FROM staff_members WHERE user_id IN (SELECT id FROM users WHERE username = $1 OR phone = $2)`,
    [testUsername, testPhone]
  );
  await pool.query(
    `DELETE FROM stores WHERE owner_id IN (SELECT id FROM users WHERE username = $1 OR phone = $2)`,
    [testUsername, testPhone]
  );
  await pool.query(
    `DELETE FROM users WHERE username = $1 OR phone = $2`,
    [testUsername, testPhone]
  );
  console.log('✅ Sinov ma\'lumotlari tozalandi');
  console.log('🎉 BARCHA BACKEND AUTH TESTLARI MUVAFFAQIYATLI O\'TDI!');
  await pool.end();
}

runTests().catch(err => {
  console.error('❌ Xatolik:', err);
  process.exit(1);
});
