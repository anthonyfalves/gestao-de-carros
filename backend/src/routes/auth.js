import { Router } from 'express';
import { login, firstChangePassword } from '../controllers/auth.js';
import { authenticate } from '../middleware/auth.js';

const r = Router();

r.post('/login', login);
r.post('/first-change', authenticate, firstChangePassword);

export default r;
