import { v4 as uuidv4 } from 'uuid';
import { Booking, Vehicle, Driver, AuditLog } from '../models/index.js';
import { logAction } from '../utils/logger.js';
import { notifyAll } from '../services/socket.js';
import { Op } from 'sequelize';

const OPEN_TIME = process.env.BOOKING_OPEN_TIME || '08:00';
const CLOSE_TIME = process.env.BOOKING_CLOSE_TIME || '18:00';

const blockStatuses = ['CANCELLED', 'REJECTED'];

const toDateOnly = (date) => new Date(date).toISOString().slice(0, 10);

const checkIntervalConflict = async ({ vehicleId, startAt, endAt, ignoreId }) => {
  if (!vehicleId) return null;
  const where = {
    vehicleId,
    status: { [Op.notIn]: blockStatuses },
    startAt: { [Op.lt]: endAt },
    endAt: { [Op.gt]: startAt },
  };
  if (ignoreId) {
    where.id = { [Op.ne]: ignoreId };
  }
  return Booking.findOne({ where });
};

export const getCalendarMeta = async (req, res) => {
  const { vehicleId } = req.query;
  const where = {
    status: { [Op.notIn]: blockStatuses },
  };
  if (vehicleId) {
    const parsedVehicle = Number(vehicleId);
    if (!Number.isInteger(parsedVehicle) || parsedVehicle <= 0) {
      return res.status(400).json({ error: 'vehicleId inválido' });
    }
    where.vehicleId = parsedVehicle;
  }

  const bookings = await Booking.findAll({ where, attributes: ['startAt', 'endAt'] });

  const blockedDates = new Set();
  bookings.forEach((booking) => {
    const start = new Date(booking.startAt);
    const end = new Date(booking.endAt);
    for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
      blockedDates.add(d.toISOString().slice(0, 10));
    }
  });

  res.json({
    openTime: OPEN_TIME,
    closeTime: CLOSE_TIME,
    bookedRanges: [],
    bookedSingleDates: Array.from(blockedDates),
    daySlots: {},
  });
};

export const createBooking = async (req, res) => {
  const { vehicleId: rawVehicleId, startAt, endAt, requestedForId } = req.body;
  if (!startAt || !endAt) return res.status(400).json({ error: 'startAt e endAt são obrigatórios' });

  const start = new Date(startAt);
  const end = new Date(endAt);
  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) {
    return res.status(400).json({ error: 'Datas inválidas' });
  }
  if (end <= start) {
    return res.status(400).json({ error: 'Entrada deve ser após a saída' });
  }

  const isManager = ['MANAGER', 'ADMIN'].includes(req.user.role);

  let bookedForId = req.user.id;
  if (isManager && requestedForId) {
    const parsedRequested = Number(requestedForId);
    if (!Number.isInteger(parsedRequested) || parsedRequested <= 0) {
      return res.status(400).json({ error: 'requestedForId inválido' });
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
      return res.status(400).json({ error: 'vehicleId inválido' });
    }
    const vehicle = await Vehicle.findOne({ where: { id: parsedVehicle, active: true } });
    if (!vehicle) return res.status(404).json({ error: 'Veículo não encontrado ou inativo' });

    const conflict = await checkIntervalConflict({ vehicleId: parsedVehicle, startAt: start, endAt: end });
    if (conflict) return res.status(409).json({ error: 'Este veículo já possui reserva no intervalo informado' });

    vehicleId = parsedVehicle;
  }

  const ticket = uuidv4();
  const dateOnly = toDateOnly(start);

  const row = await Booking.create({
    vehicleId,
    date: dateOnly,
    period: 'FULL',
    requesterId: req.user.id,
    requestedForId: bookedForId,
    ticket,
    startAt: start,
    endAt: end,
    status: 'PENDING'
  });

  await logAction(req.user.id, 'BOOKING_CREATE', { id: row.id, startAt, endAt, vehicleId }, AuditLog);
  notifyAll('booking:new', { id: row.id, startAt, endAt, vehicleId });

  res.status(201).json(row);
};

export const myBookings = async (req, res) => {
  const list = await Booking.findAll({
    where: { requestedForId: req.user.id },
    include: [
      { model: Vehicle, attributes: ['id', 'plate', 'model'] },
      { model: Driver, attributes: ['id', 'name'] },
    ],
    order: [['startAt', 'ASC']]
  });
  res.json(list);
};

export const assignDriver = async (req, res) => {
  const { bookingId, driverId } = req.body;
  if (!bookingId || !driverId) return res.status(400).json({ error: 'bookingId e driverId são obrigatórios' });

  if (!['MANAGER', 'ADMIN'].includes(req.user.role)) return res.status(403).json({ error: 'Forbidden' });

  const booking = await Booking.findByPk(bookingId);
  if (!booking) return res.status(404).json({ error: 'Booking não encontrado' });

  booking.driverId = driverId;
  await booking.save();

  await logAction(req.user.id, 'BOOKING_ASSIGN_DRIVER', { bookingId, driverId }, AuditLog);
  notifyAll('booking:driver_assigned', { bookingId, driverId });

  res.json({ ok: true });
};

export const assignVehicle = async (req, res) => {
  const { bookingId, vehicleId } = req.body;
  if (!bookingId || !vehicleId) return res.status(400).json({ error: 'bookingId e vehicleId são obrigatórios' });

  if (!['MANAGER', 'ADMIN'].includes(req.user.role)) {
    return res.status(403).json({ error: 'Forbidden' });
  }

  const parsedBooking = Number(bookingId);
  const parsedVehicle = Number(vehicleId);
  if (!Number.isInteger(parsedBooking) || parsedBooking <= 0 || !Number.isInteger(parsedVehicle) || parsedVehicle <= 0) {
    return res.status(400).json({ error: 'bookingId ou vehicleId inválidos' });
  }

  const booking = await Booking.findByPk(parsedBooking);
  if (!booking) return res.status(404).json({ error: 'Booking não encontrado' });

  if (booking.vehicleId === parsedVehicle) {
    return res.json({ ok: true });
  }

  const vehicle = await Vehicle.findOne({ where: { id: parsedVehicle, active: true } });
  if (!vehicle) return res.status(404).json({ error: 'Veículo não encontrado ou inativo' });

  const conflict = await checkIntervalConflict({ vehicleId: parsedVehicle, startAt: booking.startAt, endAt: booking.endAt, ignoreId: booking.id });
  if (conflict) return res.status(409).json({ error: 'Veículo indisponível para o intervalo escolhido' });

  booking.vehicleId = parsedVehicle;
  await booking.save();

  await logAction(req.user.id, 'BOOKING_ASSIGN_VEHICLE', { bookingId: parsedBooking, vehicleId: parsedVehicle }, AuditLog);
  notifyAll('booking:vehicle_assigned', { bookingId: parsedBooking, vehicleId: parsedVehicle });

  res.json({ ok: true });
};

export const approveBooking = async (req, res) => {
  const { id } = req.params;
  if (!['MANAGER', 'ADMIN'].includes(req.user.role)) {
    return res.status(403).json({ error: 'Forbidden' });
  }
  const booking = await Booking.findByPk(id);
  if (!booking) return res.status(404).json({ error: 'Booking não encontrado' });
  if (booking.status !== 'PENDING') return res.status(409).json({ error: 'Somente solicitações pendentes podem ser aprovadas' });

  if (booking.vehicleId) {
    const conflict = await checkIntervalConflict({ vehicleId: booking.vehicleId, startAt: booking.startAt, endAt: booking.endAt, ignoreId: booking.id });
    if (conflict) return res.status(409).json({ error: 'Conflito encontrado para o veículo selecionado' });
  }

  booking.status = 'APPROVED';
  booking.approvedBy = req.user.id;
  booking.approvedAt = new Date();
  booking.rejectReason = null;
  await booking.save();

  await logAction(req.user.id, 'BOOKING_APPROVE', { bookingId: booking.id }, AuditLog);
  notifyAll('booking:status_change', { bookingId: booking.id, status: 'APPROVED' });

  res.json({ ok: true });
};

export const rejectBooking = async (req, res) => {
  const { id } = req.params;
  const { reason } = req.body || {};
  if (!['MANAGER', 'ADMIN'].includes(req.user.role)) {
    return res.status(403).json({ error: 'Forbidden' });
  }
  const booking = await Booking.findByPk(id);
  if (!booking) return res.status(404).json({ error: 'Booking não encontrado' });
  if (booking.status !== 'PENDING') return res.status(409).json({ error: 'Somente solicitações pendentes podem ser rejeitadas' });

  booking.status = 'REJECTED';
  booking.approvedBy = req.user.id;
  booking.approvedAt = new Date();
  booking.rejectReason = reason || null;
  await booking.save();

  await logAction(req.user.id, 'BOOKING_REJECT', { bookingId: booking.id, reason }, AuditLog);
  notifyAll('booking:status_change', { bookingId: booking.id, status: 'REJECTED' });

  res.json({ ok: true });
};
