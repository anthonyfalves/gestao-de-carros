import { Sequelize, DataTypes } from 'sequelize';
import 'dotenv/config';

const sequelize = new Sequelize(
  process.env.DB_NAME || 'gf_db',
  process.env.DB_USER || 'gf_user',
  process.env.DB_PASS || 'gf_pass',
  {
    host: process.env.DB_HOST || '127.0.0.1',
    port: Number(process.env.DB_PORT || 5432),
    dialect: 'postgres',
    logging: false,
  }
);

export const User = sequelize.define('User', {
  id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
  email: { type: DataTypes.STRING, unique: true, allowNull: false },
  name: { type: DataTypes.STRING, allowNull: false },
  passwordHash: { type: DataTypes.STRING, allowNull: false },
  role: { type: DataTypes.ENUM('USER', 'MANAGER', 'ADMIN'), allowNull: false, defaultValue: 'USER' },
  mustChangePassword: { type: DataTypes.BOOLEAN, defaultValue: true },
}, { tableName: 'users', timestamps: true });

export const Vehicle = sequelize.define('Vehicle', {
  id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
  plate: { type: DataTypes.STRING, unique: true, allowNull: false },
  model: { type: DataTypes.STRING, allowNull: false },
  active: { type: DataTypes.BOOLEAN, defaultValue: true },
}, { tableName: 'vehicles', timestamps: true });

export const Driver = sequelize.define('Driver', {
  id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
  name: { type: DataTypes.STRING, allowNull: false },
  cnh: { type: DataTypes.STRING, allowNull: true }, // Não exibida ao solicitante
  active: { type: DataTypes.BOOLEAN, defaultValue: true },
}, { tableName: 'drivers', timestamps: true });

export const Booking = sequelize.define('Booking', {
  id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
  date: { type: DataTypes.DATEONLY, allowNull: false },
  period: { type: DataTypes.ENUM('AM','PM','FULL'), allowNull: false },
  ticket: { type: DataTypes.STRING, unique: true, allowNull: false },
  requesterId: { type: DataTypes.INTEGER, allowNull: false },
  requestedForId: { type: DataTypes.INTEGER, allowNull: false }, // para terceiros
  vehicleId: { type: DataTypes.INTEGER, allowNull: true },
  driverId: { type: DataTypes.INTEGER, allowNull: true },
  startAt: { type: DataTypes.DATE, allowNull: false },
  endAt: { type: DataTypes.DATE, allowNull: false },
  approvedBy: { type: DataTypes.INTEGER, allowNull: true },
  approvedAt: { type: DataTypes.DATE, allowNull: true },
  rejectReason: { type: DataTypes.TEXT, allowNull: true },
  status: { type: DataTypes.ENUM('PENDING','APPROVED','REJECTED','CANCELLED'), defaultValue: 'PENDING' }
}, { tableName: 'bookings', timestamps: true });

export const AuditLog = sequelize.define('AuditLog', {
  id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
  userId: { type: DataTypes.INTEGER, allowNull: false },
  action: { type: DataTypes.STRING, allowNull: false },
  metadata: { type: DataTypes.JSONB, allowNull: true },
}, { tableName: 'audit_logs', timestamps: true });

// Relations
User.hasMany(Booking, { foreignKey: 'requesterId', as: 'requested' });
User.hasMany(Booking, { foreignKey: 'requestedForId', as: 'bookedFor' });
Booking.belongsTo(User, { foreignKey: 'requesterId', as: 'requester' });
Booking.belongsTo(User, { foreignKey: 'requestedForId', as: 'requestedFor' });
User.hasMany(Booking, { foreignKey: 'approvedBy', as: 'approvedBookings' });
Booking.belongsTo(User, { foreignKey: 'approvedBy', as: 'approver' });

Vehicle.hasMany(Booking, { foreignKey: 'vehicleId' });
Booking.belongsTo(Vehicle, { foreignKey: 'vehicleId' });

Driver.hasMany(Booking, { foreignKey: 'driverId' });
Booking.belongsTo(Driver, { foreignKey: 'driverId' });

export const sequelizeInstance = sequelize;
