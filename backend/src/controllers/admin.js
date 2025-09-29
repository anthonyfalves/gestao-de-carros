import bcrypt from 'bcrypt';
import { User, Vehicle, Driver, AuditLog, Booking } from '../models/index.js';
import { logAction } from '../utils/logger.js';

const ensureAdmin = (req, res) => {
  if (req.user.role !== 'ADMIN') {
    res.status(403).json({ error: 'Forbidden' });
    return false;
  }
  return true;
};

// ===== USUÁRIOS =====
export const createUser = async (req, res) => {
  if (!ensureAdmin(req, res)) return;
  const { email, name, password, role='USER' } = req.body;
  const passwordHash = await bcrypt.hash(password || 'Trocar123!', 10);
  const row = await User.create({ email, name, passwordHash, role, mustChangePassword: true });
  await logAction(req.user.id, 'USER_CREATE', { id: row.id }, AuditLog);
  res.status(201).json({ id: row.id });
};

export const listUsers = async (req, res) => {
  if (req.user.role === 'ADMIN') {
    const rows = await User.findAll({ attributes: ['id','email','name','role','mustChangePassword'] });
    return res.json(rows);
  }
  res.status(403).json({ error: 'Forbidden' });
};

// ===== VEÍCULOS =====
// Admin ou Gestor podem cadastrar
export const createVehicle = async (req, res) => {
  if (req.user.role !== 'ADMIN' && req.user.role !== 'MANAGER') {
    return res.status(403).json({ error: 'Forbidden' });
  }
  const { plate, model } = req.body;
  if (!plate || !model) return res.status(400).json({ error: 'plate e model são obrigatórios' });

  const exists = await Vehicle.findOne({ where: { plate } });
  if (exists) return res.status(409).json({ error: 'Placa já cadastrada' });

  const row = await Vehicle.create({ plate, model, active: true });
  await logAction(req.user.id, 'VEHICLE_CREATE', { id: row.id, plate }, AuditLog);
  return res.status(201).json({ id: row.id });
};

// “Excluir” veículo = soft delete (active=false)
export const deleteVehicle = async (req, res) => {
  if (req.user.role !== 'ADMIN' && req.user.role !== 'MANAGER') {
    return res.status(403).json({ error: 'Forbidden' });
  }
  const { id } = req.params;
  const v = await Vehicle.findByPk(id);
  if (!v) return res.status(404).json({ error: 'Veículo não encontrado' });

  // Se preferir impedir exclusão quando houver agendamentos futuros, descomente:
  // const hasFuture = await Booking.findOne({ where: { vehicleId: id, status: ['PENDING','APPROVED'] } });
  // if (hasFuture) return res.status(409).json({ error: 'Veículo possui agendamentos; cancele/realocar antes.' });

  v.active = false;
  await v.save();
  await logAction(req.user.id, 'VEHICLE_SOFT_DELETE', { id: v.id, plate: v.plate }, AuditLog);
  return res.json({ ok: true });
};

// (opcional) lista completa para gestão (inclui inativos)
export const adminListVehicles = async (req, res) => {
  if (req.user.role !== 'ADMIN' && req.user.role !== 'MANAGER') {
    return res.status(403).json({ error: 'Forbidden' });
  }
  const rows = await Vehicle.findAll({ order: [['id','ASC']] });
  res.json(rows);
};


// ===== MOTORISTAS =====
// Criar motorista (ADMIN | MANAGER)
export const createDriver = async (req, res) => {
  if (req.user.role !== 'ADMIN' && req.user.role !== 'MANAGER') {
    return res.status(403).json({ error: 'Forbidden' });
  }
  const { name, cnh } = req.body;
  if (!name) return res.status(400).json({ error: 'name é obrigatório' });

  const row = await Driver.create({ name, cnh, active: true });
  await logAction(req.user.id, 'DRIVER_CREATE', { id: row.id }, AuditLog);
  return res.status(201).json({ id: row.id });
};

// Desativar (soft delete) motorista (ADMIN | MANAGER)
export const deleteDriver = async (req, res) => {
  try {
    if (req.user.role !== 'ADMIN' && req.user.role !== 'MANAGER') {
      return res.status(403).json({ error: 'Forbidden' });
    }
    const id = Number(req.params.id);
    if (!Number.isInteger(id) || id <= 0) {
      return res.status(400).json({ error: 'Invalid driver id' });
    }

    const d = await Driver.findByPk(id);
    if (!d) return res.status(404).json({ error: 'Motorista não encontrado' });

    d.active = false;
    await d.save();
    await logAction(req.user.id, 'DRIVER_SOFT_DELETE', { id: d.id, name: d.name }, AuditLog);
    return res.json({ ok: true });
  } catch (err) {
    console.error('[DELETE DRIVER] error:', err);
    return res.status(500).json({ error: 'Internal error' });
  }
};

// Lista administrativa (inclui inativos) (ADMIN | MANAGER)
export const adminListDrivers = async (req, res) => {
  if (req.user.role !== 'ADMIN' && req.user.role !== 'MANAGER') {
    return res.status(403).json({ error: 'Forbidden' });
  }
  const rows = await Driver.findAll({ order: [['id', 'ASC']] });
  res.json(rows);
};