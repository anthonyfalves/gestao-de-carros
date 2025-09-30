import { Router } from 'express';
import {
  getCalendarMeta,
  createBooking,
  myBookings,
  assignDriver,
  assignVehicle,
  approveBooking,
  rejectBooking,
} from '../controllers/bookings.js';

const r = Router();

r.get('/calendar-meta', getCalendarMeta);        // disponibilidades e bloqueios
r.post('/', createBooking);                    // cria agendamento (gera ticket único)
r.get('/mine', myBookings);                    // meus agendamentos
r.post('/assign-driver', assignDriver);        // gestor/admin atribui motorista
r.post('/assign-vehicle', assignVehicle);      // gestor/admin atribui veículo
r.post('/:id/approve', approveBooking);        // gestor/admin aprova
r.post('/:id/reject', rejectBooking);          // gestor/admin rejeita

export default r;
