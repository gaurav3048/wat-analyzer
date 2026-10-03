import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import User from '../models/User.js';

const generateToken = (user) => {
  return jwt.sign(
    {
      sub: user._id.toString(),
      id: user._id.toString(),
      user_id: user._id.toString(),
      username: user.username,
      email: user.email,
    },
    process.env.JWT_SECRET || 'super_secret_wat_jwt_key_2026',
    { expiresIn: process.env.JWT_EXPIRES_IN || '7d' }
  );
};

export const register = async (req, res) => {
  try {
    const { username, email, password, full_name } = req.body;

    if (!username || !email || !password) {
      return res.status(400).json({ detail: 'Username, email, and password are required' });
    }

    const cleanUsername = username.trim().toLowerCase();
    const cleanEmail = email.trim().toLowerCase();

    const existingUser = await User.findOne({
      $or: [{ username: cleanUsername }, { email: cleanEmail }],
    });

    if (existingUser) {
      return res.status(400).json({ detail: 'Username or email already registered' });
    }

    // 12 rounds of bcrypt
    const hashedPassword = await bcrypt.hash(password, 12);

    const newUser = await User.create({
      username: cleanUsername,
      email: cleanEmail,
      password: hashedPassword,
      fullName: full_name || '',
    });

    const token = generateToken(newUser);

    return res.status(200).json({
      access_token: token,
      token_type: 'bearer',
      user_id: newUser._id.toString(),
      username: newUser.username,
      email: newUser.email,
    });
  } catch (err) {
    console.error('Registration error:', err);
    return res.status(500).json({ detail: 'Server error during registration' });
  }
};

export const login = async (req, res) => {
  try {
    const { username, password } = req.body;

    if (!username || !password) {
      return res.status(400).json({ detail: 'Username and password required' });
    }

    const cleanIdentifier = username.trim().toLowerCase();
    const user = await User.findOne({
      $or: [{ username: cleanIdentifier }, { email: cleanIdentifier }],
    });

    if (!user) {
      return res.status(401).json({ detail: 'Incorrect username or password' });
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(401).json({ detail: 'Incorrect username or password' });
    }

    const token = generateToken(user);

    return res.status(200).json({
      access_token: token,
      token_type: 'bearer',
      user_id: user._id.toString(),
      username: user.username,
      email: user.email,
    });
  } catch (err) {
    console.error('Login error:', err);
    return res.status(500).json({ detail: 'Server error during login' });
  }
};

export const getMe = async (req, res) => {
  try {
    return res.status(200).json({
      user_id: req.user._id.toString(),
      id: req.user._id.toString(),
      username: req.user.username,
      email: req.user.email,
      role: req.user.role,
    });
  } catch (err) {
    return res.status(500).json({ detail: 'Server error retrieving profile' });
  }
};
