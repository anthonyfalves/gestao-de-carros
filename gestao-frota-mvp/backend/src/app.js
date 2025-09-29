import express from 'express';
import cors from 'cors';
import 'dotenv/config';
import helmet from 'helmet';
import morgan from 'morgan';

import authRoutes from './routes/auth.js';
import bookingRoutes from './routes/bookings.js';
import adminRoutes from './routes/admin.js';
import catalogRoutes from './routes/catalog.js';
import { authenticate } from './middleware/auth.js';

const app = express();
app.use(express.json());
app.use(helmet());
app.use(cors({ origin: process.env.SOCKET_CORS_ORIGIN?.split(',') || '*'}));
app.use(morgan('dev'));

app.get('/health', (req, res) => res.json({ ok: true }));

app.use('/auth', authRoutes);
app.use('/catalog', authenticate, catalogRoutes);
app.use('/bookings', authenticate, bookingRoutes);
app.use('/admin', authenticate, adminRoutes);

export default app;
