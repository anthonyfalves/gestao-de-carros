'use strict';
export async function up(queryInterface, Sequelize) {
  await queryInterface.createTable('bookings', {
    id: { type: Sequelize.INTEGER, autoIncrement: true, primaryKey: true, allowNull: false },
    date: { type: Sequelize.DATEONLY, allowNull: false },
    period: { type: Sequelize.ENUM('AM','PM','FULL'), allowNull: false },
    ticket: { type: Sequelize.STRING, allowNull: false, unique: true },
    requesterId: { type: Sequelize.INTEGER, allowNull: false, references: { model: 'users', key: 'id' } },
    requestedForId: { type: Sequelize.INTEGER, allowNull: false, references: { model: 'users', key: 'id' } },
    vehicleId: { type: Sequelize.INTEGER, allowNull: false, references: { model: 'vehicles', key: 'id' } },
    driverId: { type: Sequelize.INTEGER, references: { model: 'drivers', key: 'id' } },
    status: { type: Sequelize.ENUM('PENDING','APPROVED','CANCELLED'), defaultValue: 'PENDING' },
    createdAt: { type: Sequelize.DATE, allowNull: false },
    updatedAt: { type: Sequelize.DATE, allowNull: false }
  });
}
export async function down(queryInterface, Sequelize) { await queryInterface.dropTable('bookings'); }
