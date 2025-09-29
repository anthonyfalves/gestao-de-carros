import { Vehicle, Driver } from '../models/index.js';

export const listVehicles = async (req, res) => {
  const items = await Vehicle.findAll({ where: { active: true }, order: [['id','ASC']] });
  res.json(items);
};

export const listDrivers = async (req, res) => {
  const items = await Driver.findAll({ where: { active: true }, order: [['id','ASC']] });
  // Importante: ao solicitante, nunca expor CNH — apenas nome será usado no frontend.
  res.json(items.map(d => ({ id: d.id, name: d.name })));
};
