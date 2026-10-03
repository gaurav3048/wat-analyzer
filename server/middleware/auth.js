import jwt from 'jsonwebtoken';
import User from '../models/User.js';

export const authenticateToken = async (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({ detail: 'Authentication token missing' });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'super_secret_wat_jwt_key_2026');
    const userId = decoded.sub || decoded.id || decoded.user_id;

    const user = await User.findById(userId).select('-password');
    if (!user) {
      return res.status(401).json({ detail: 'User account not found' });
    }

    req.user = user;
    next();
  } catch (err) {
    return res.status(401).json({ detail: 'Invalid or expired token' });
  }
};
