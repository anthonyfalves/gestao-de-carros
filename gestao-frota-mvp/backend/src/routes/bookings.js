import { Router } from 'express';
import { getAvailability, createBooking, myBookings, assignDriver, assignVehicle } from '../controllers/bookings.js';

const r = Router();

r.get('/availability', getAvailability);        // retorna períodos ocupados
r.post('/', createBooking);                    // cria agendamento (gera ticket único)
r.get('/mine', myBookings);                    // meus agendamentos
r.post('/assign-driver', assignDriver);        // gestor/admin atribui motorista
r.post('/assign-vehicle', assignVehicle);      // gestor/admin atribui veículo

export default r;
