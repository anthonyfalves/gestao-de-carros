'use strict';

export async function up(queryInterface, Sequelize) {
  await queryInterface.changeColumn('bookings', 'vehicleId', {
    type: Sequelize.INTEGER,
    allowNull: true,
    references: { model: 'vehicles', key: 'id' }
  });
}

export async function down(queryInterface, Sequelize) {
  await queryInterface.changeColumn('bookings', 'vehicleId', {
    type: Sequelize.INTEGER,
    allowNull: false,
    references: { model: 'vehicles', key: 'id' }
  });
}
