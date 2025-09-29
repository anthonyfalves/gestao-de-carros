'use strict';
export async function up(queryInterface, Sequelize) {
  await queryInterface.createTable('audit_logs', {
    id: { type: Sequelize.INTEGER, autoIncrement: true, primaryKey: true, allowNull: false },
    userId: { type: Sequelize.INTEGER, allowNull: false, references: { model: 'users', key: 'id' } },
    action: { type: Sequelize.STRING, allowNull: false },
    metadata: { type: Sequelize.JSONB },
    createdAt: { type: Sequelize.DATE, allowNull: false },
    updatedAt: { type: Sequelize.DATE, allowNull: false }
  });
}
export async function down(queryInterface, Sequelize) { await queryInterface.dropTable('audit_logs'); }
