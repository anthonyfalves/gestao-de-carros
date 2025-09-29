'use strict';
export async function up(queryInterface, Sequelize) {
  await queryInterface.createTable('vehicles', {
    id: { type: Sequelize.INTEGER, autoIncrement: true, primaryKey: true, allowNull: false },
    plate: { type: Sequelize.STRING, allowNull: false, unique: true },
    model: { type: Sequelize.STRING, allowNull: false },
    active: { type: Sequelize.BOOLEAN, defaultValue: true },
    createdAt: { type: Sequelize.DATE, allowNull: false },
    updatedAt: { type: Sequelize.DATE, allowNull: false }
  });
}
export async function down(queryInterface, Sequelize) { await queryInterface.dropTable('vehicles'); }
