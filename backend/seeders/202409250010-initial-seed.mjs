'use strict';
import bcrypt from 'bcrypt';

export async function up (queryInterface, Sequelize) {
  const passwordHash = await bcrypt.hash('12345', 10);
  await queryInterface.bulkInsert('users', [
    { email: 'admin', name: 'Admin', passwordHash, role: 'ADMIN', mustChangePassword: true, createdAt: new Date(), updatedAt: new Date() },
    { email: 'gestor', name: 'Gestor', passwordHash, role: 'MANAGER', mustChangePassword: true, createdAt: new Date(), updatedAt: new Date() },
    { email: 'usuario', name: 'Usuário', passwordHash, role: 'USER', mustChangePassword: true, createdAt: new Date(), updatedAt: new Date() },
  ]);

  await queryInterface.bulkInsert('vehicles', [
    { plate: 'ABC1D23', model: 'Fiat Uno', active: true, createdAt: new Date(), updatedAt: new Date() },
    { plate: 'EFG4H56', model: 'VW Gol', active: true, createdAt: new Date(), updatedAt: new Date() },
  ]);

  await queryInterface.bulkInsert('drivers', [
    { name: 'João Motorista', cnh: '***', active: true, createdAt: new Date(), updatedAt: new Date() },
    { name: 'Maria Condutora', cnh: '***', active: true, createdAt: new Date(), updatedAt: new Date() },
  ]);
}

export async function down (queryInterface, Sequelize) {
  await queryInterface.bulkDelete('audit_logs', null, {});
  await queryInterface.bulkDelete('bookings', null, {});
  await queryInterface.bulkDelete('drivers', null, {});
  await queryInterface.bulkDelete('vehicles', null, {});
  await queryInterface.bulkDelete('users', null, {});
}
