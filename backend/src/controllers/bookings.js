import { v4 as uuidv4 } from 'uuid';
import { Booking, Vehicle, Driver, AuditLog } from '../models/index.js';
import { logAction } from '../utils/logger.js';
import { notifyAll } from '../services/socket.js';
import { Op } from 'sequelize';

export const getAvailability = async (req, res) => {
  const { vehicleId, from, to } = req.query;
  if (!vehicleId || !from || !to) return res.status(400).json({ error: 'vehicleId, from, to are required' });

  const rows = await Booking.findAll({
    where: {
      vehicleId: Number(vehicleId),
      date: { [Op.between]: [from, to] },
      status: { [Op.ne]: 'CANCELLED' }
    },
    attributes: ['date','period']
  });

  res.json(rows);
};

export const createBooking = async (req, res) => {
  const { vehicleId: rawVehicleId, date, period, requestedForId } = req.body;
  if (!date || !period) return res.status(400).json({ error: 'date and period are required' });

  const isManager = ['MANAGER', 'ADMIN'].includes(req.user.role);

  let bookedForId = req.user.id;
  if (isManager && requestedForId) {
    const parsedRequested = Number(requestedForId);
    if (!Number.isInteger(parsedRequested) || parsedRequested <= 0) {
      return res.status(400).json({ error: 'Invalid requestedForId' });
    }
    bookedForId = parsedRequested;
  }

  let vehicleId = null;
  if (rawVehicleId !== undefined && rawVehicleId !== null && rawVehicleId !== '') {
    if (!isManager) {
      return res.status(403).json({ error: 'Somente gestor ou admin podem selecionar o veículo no agendamento' });
    }
    const parsedVehicle = Number(rawVehicleId);
    if (!Number.isInteger(parsedVehicle) || parsedVehicle <= 0) {
      return res.status(400).json({ error: 'Invalid vehicleId' });
    }
    const vehicle = await Vehicle.findOne({ where: { id: parsedVehicle, active: true } });
    if (!vehicle) return res.status(404).json({ error: 'Veículo não encontrado ou inativo' });

    const conflict = await Booking.findOne({
      where: { vehicleId: parsedVehicle, date, period, status: { [Op.ne]: 'CANCELLED' } }
    });
    if (conflict) return res.status(409).json({ error: 'Date/period already booked for this vehicle' });

    vehicleId = parsedVehicle;
  }

  const ticket = uuidv4();

  const row = await Booking.create({
    vehicleId,
    date,
    period,
    requesterId: req.user.id,
    requestedForId: bookedForId,
    ticket
  });

  await logAction(req.user.id, 'BOOKING_CREATE', { id: row.id, date, period, vehicleId }, AuditLog);
  notifyAll('booking:new', { id: row.id, date, period, vehicleId });

  res.status(201).json(row);
};

export const myBookings = async (req, res) => {
  const list = await Booking.findAll({
    where: { requestedForId: req.user.id },
    include: [
      { model: Vehicle, attributes: ['id','plate','model'] },
      { model: Driver, attributes: ['id','name'] },
    ],
    order: [['date','ASC']]
  });
  res.json(list);
};

export const assignDriver = async (req, res) => {
  const { bookingId, driverId } = req.body;
  if (!bookingId || !driverId) return res.status(400).json({ error: 'bookingId, driverId required' });

  // somente gestor/admin
  if (!['MANAGER','ADMIN'].includes(req.user.role)) return res.status(403).json({ error: 'Forbidden' });

  const booking = await Booking.findByPk(bookingId);
  if (!booking) return res.status(404).json({ error: 'Booking not found' });

  booking.driverId = driverId;
  await booking.save();

  await logAction(req.user.id, 'BOOKING_ASSIGN_DRIVER', { bookingId, driverId }, AuditLog);
  notifyAll('booking:driver_assigned', { bookingId, driverId });

  res.json({ ok: true });
};

export const assignVehicle = async (req, res) => {
  const { bookingId, vehicleId } = req.body;
  if (!bookingId || !vehicleId) return res.status(400).json({ error: 'bookingId, vehicleId required' });

  if (!['MANAGER', 'ADMIN'].includes(req.user.role)) {
    return res.status(403).json({ error: 'Forbidden' });
  }

  const parsedBooking = Number(bookingId);
  const parsedVehicle = Number(vehicleId);
  if (!Number.isInteger(parsedBooking) || parsedBooking <= 0 || !Number.isInteger(parsedVehicle) || parsedVehicle <= 0) {
    return res.status(400).json({ error: 'Invalid bookingId or vehicleId' });
  }

  const booking = await Booking.findByPk(parsedBooking);
  if (!booking) return res.status(404).json({ error: 'Booking not found' });

  if (booking.vehicleId === parsedVehicle) {
    return res.json({ ok: true });
  }

  const vehicle = await Vehicle.findOne({ where: { id: parsedVehicle, active: true } });
  if (!vehicle) return res.status(404).json({ error: 'Veículo não encontrado ou inativo' });

  const conflict = await Booking.findOne({
    where: {
      id: { [Op.ne]: parsedBooking },
      vehicleId: parsedVehicle,
      date: booking.date,
      period: booking.period,
      status: { [Op.ne]: 'CANCELLED' }
    }
  });
  if (conflict) return res.status(409).json({ error: 'Veículo indisponível para o período escolhido' });

  booking.vehicleId = parsedVehicle;
  await booking.save();

  await logAction(req.user.id, 'BOOKING_ASSIGN_VEHICLE', { bookingId: parsedBooking, vehicleId: parsedVehicle }, AuditLog);
  notifyAll('booking:vehicle_assigned', { bookingId: parsedBooking, vehicleId: parsedVehicle });

  res.json({ ok: true });
};
