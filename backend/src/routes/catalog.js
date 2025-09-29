import { Router } from 'express';
import { listVehicles, listDrivers } from '../controllers/catalog.js';

const r = Router();
r.get('/vehicles', listVehicles);
r.get('/drivers', listDrivers);

export default r;
