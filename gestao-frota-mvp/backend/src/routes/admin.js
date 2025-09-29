import { Router } from 'express';
import { createUser, listUsers, createVehicle, deleteVehicle, adminListVehicles, createDriver, deleteDriver, adminListDrivers } from '../controllers/admin.js';

const r = Router();

// Usuários (somente ADMIN)
r.post('/users', createUser);
r.get('/users', listUsers);

// Veículos (ADMIN | MANAGER)
r.post('/vehicles', createVehicle);
r.delete('/vehicles/:id(\\d+)', deleteVehicle);
r.get('/vehicles', adminListVehicles); // lista inclusive inativos para gestão

// Motoristas (ADMIN | MANAGER)
r.post('/drivers', createDriver);
r.delete('/drivers/:id(\\d+)', deleteDriver);
r.get('/drivers', adminListDrivers);

export default r;
