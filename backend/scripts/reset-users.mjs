'use strict';
import bcrypt from 'bcrypt';
import { User, sequelizeInstance } from '../src/models/index.js';

const USERS = [
  { oldEmail: 'admin@local', newEmail: 'admin', name: 'Admin', role: 'ADMIN' },
  { oldEmail: 'gestor@local', newEmail: 'gestor', name: 'Gestor', role: 'MANAGER' },
  { oldEmail: 'usuario@local', newEmail: 'usuario', name: 'Usuário', role: 'USER' },
];

async function upsertUser({ oldEmail, newEmail, name, role }, hash) {
  let u = await User.findOne({ where: { email: oldEmail } });
  if (u) {
    u.email = newEmail;
    u.name = name;
    u.role = role;
    u.passwordHash = hash;
    u.mustChangePassword = true;
    await u.save();
    console.log(`[updated] ${oldEmail} -> ${newEmail}`);
    return;
  }
  u = await User.findOne({ where: { email: newEmail } });
  if (u) {
    u.name = name;
    u.role = role;
    u.passwordHash = hash;
    u.mustChangePassword = true;
    await u.save();
    console.log(`[updated] ${newEmail}`);
    return;
  }
  await User.create({
    email: newEmail,
    name,
    role,
    passwordHash: hash,
    mustChangePassword: true,
  });
  console.log(`[created] ${newEmail}`);
}

(async () => {
  try {
    const hash = await bcrypt.hash('12345', 10);
    for (const u of USERS) {
      await upsertUser(u, hash);
    }
  } catch (err) {
    console.error('reset-users failed:', err);
    process.exitCode = 1;
  } finally {
    await sequelizeInstance.close();
  }
})();

