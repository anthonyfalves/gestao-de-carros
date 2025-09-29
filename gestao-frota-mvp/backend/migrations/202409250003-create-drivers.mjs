'use strict';
export async function up(queryInterface, Sequelize) {
  await queryInterface.createTable('drivers', {
    id: { type: Sequelize.INTEGER, autoIncrement: true, primaryKey: true, allowNull: false },
    name: { type: Sequelize.STRING, allowNull: false },
    cnh: { type: Sequelize.STRING },
    active: { type: Sequelize.BOOLEAN, defaultValue: true },
    createdAt: { type: Sequelize.DATE, allowNull: false },
    updatedAt: { type: Sequelize.DATE, allowNull: false }
  });
}
export async function down(queryInterface, Sequelize) { await queryInterface.dropTable('drivers'); }
