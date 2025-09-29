import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { User, AuditLog } from '../models/index.js';
import { logAction } from '../utils/logger.js';

export const login = async (req, res) => {
  const { email, password } = req.body;
  const user = await User.findOne({ where: { email } });
  if (!user) return res.status(401).json({ error: 'Invalid credentials' });
  const ok = await bcrypt.compare(password, user.passwordHash);
  if (!ok) return res.status(401).json({ error: 'Invalid credentials' });

  const token = jwt.sign({ id: user.id, role: user.role }, process.env.JWT_SECRET, { expiresIn: '8h' });

  await logAction(user.id, 'LOGIN', { email }, AuditLog);

  res.json({
    token,
    user: { id: user.id, email: user.email, name: user.name, role: user.role, mustChangePassword: user.mustChangePassword },
  });
};

export const firstChangePassword = async (req, res) => {
  const { currentPassword, newPassword } = req.body;
  const user = await User.findByPk(req.user.id);
  if (!user) return res.status(404).json({ error: 'User not found' });
  const ok = await bcrypt.compare(currentPassword, user.passwordHash);
  if (!ok) return res.status(400).json({ error: 'Invalid current password' });

  user.passwordHash = await bcrypt.hash(newPassword, 10);
  user.mustChangePassword = false;
  await user.save();

  await logAction(user.id, 'PASSWORD_CHANGE', {}, AuditLog);

  res.json({ ok: true });
};
