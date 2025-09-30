'use strict';

export async function up(queryInterface, Sequelize) {
  await queryInterface.addColumn('bookings', 'startAt', { type: Sequelize.DATE, allowNull: true });
  await queryInterface.addColumn('bookings', 'endAt', { type: Sequelize.DATE, allowNull: true });
  await queryInterface.addColumn('bookings', 'approvedBy', {
    type: Sequelize.INTEGER,
    allowNull: true,
    references: { model: 'users', key: 'id' },
    onDelete: 'SET NULL'
  });
  await queryInterface.addColumn('bookings', 'approvedAt', { type: Sequelize.DATE, allowNull: true });
  await queryInterface.addColumn('bookings', 'rejectReason', { type: Sequelize.TEXT, allowNull: true });

  await queryInterface.sequelize.query(`
    UPDATE bookings
    SET "startAt" = CASE period
        WHEN 'AM' THEN date::timestamp + TIME '08:00'
        WHEN 'PM' THEN date::timestamp + TIME '13:00'
        ELSE date::timestamp + TIME '08:00'
      END,
      "endAt" = CASE period
        WHEN 'AM' THEN date::timestamp + TIME '12:00'
        WHEN 'PM' THEN date::timestamp + TIME '18:00'
        ELSE date::timestamp + TIME '18:00'
      END
    WHERE "startAt" IS NULL OR "endAt" IS NULL;
  `);

  await queryInterface.changeColumn('bookings', 'startAt', { type: Sequelize.DATE, allowNull: false });
  await queryInterface.changeColumn('bookings', 'endAt', { type: Sequelize.DATE, allowNull: false });

  await queryInterface.sequelize.query('ALTER TYPE "enum_bookings_status" ADD VALUE IF NOT EXISTS \'REJECTED\'');
}

export async function down(queryInterface, Sequelize) {
  await queryInterface.removeColumn('bookings', 'rejectReason');
  await queryInterface.removeColumn('bookings', 'approvedAt');
  await queryInterface.removeColumn('bookings', 'approvedBy');
  await queryInterface.removeColumn('bookings', 'endAt');
  await queryInterface.removeColumn('bookings', 'startAt');
}
