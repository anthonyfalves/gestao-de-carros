import jwt from 'jsonwebtoken';
import { User } from '../models/index.js';

export const authenticate = async (req, res, next) => {
  const header = req.headers.authorization || '';
  const token = header.startsWith('Bearer ') ? header.slice(7) : null;
  if (!token) return res.status(401).json({ error: 'Unauthorized' });
  try {
    const payload = jwt.verify(token, process.env.JWT_SECRET);
    const user = await User.findByPk(payload.id);
    if (!user) return res.status(401).json({ error: 'Unauthorized' });
    req.user = { id: user.id, email: user.email, role: user.role, mustChangePassword: user.mustChangePassword };
    next();
  } catch (e) {
    return res.status(401).json({ error: 'Invalid token' });
  }
};

export const requireRole = (roles = []) => (req, res, next) => {
  if (!roles.length) return next();
  if (!req.user) return res.status(401).json({ error: 'Unauthorized' });
  if (!roles.includes(req.user.role)) return res.status(403).json({ error: 'Forbidden' });
  next();
};
