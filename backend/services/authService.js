import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { db } from './db.js';

const JWT_SECRET = process.env.JWT_SECRET || 'local-llm-super-secret-key-change-in-prod';
const JWT_EXPIRES = '7d';

export async function registerUser(email, password, name) {
  const data = db.read();

  // Check if user already exists
  const existing = data.users.find(u => u.email === email.toLowerCase());
  if (existing) {
    throw new Error('A user with this email already exists.');
  }

  const password_hash = await bcrypt.hash(password, 10);
  const newUser = {
    id: Math.random().toString(36).substring(2, 11),
    email: email.toLowerCase(),
    name: name || email.split('@')[0],
    password_hash,
    created_at: new Date().toISOString()
  };

  data.users.push(newUser);
  db.write(data);

  const token = jwt.sign({ id: newUser.id, email: newUser.email }, JWT_SECRET, { expiresIn: JWT_EXPIRES });
  return { token, user: { id: newUser.id, email: newUser.email, name: newUser.name } };
}

export async function loginUser(email, password) {
  const data = db.read();

  const user = data.users.find(u => u.email === email.toLowerCase());
  if (!user) {
    throw new Error('No account found with this email.');
  }

  // Handle legacy users without password (the seed 'local-user')
  if (!user.password_hash) {
    // Auto-set password for the default local user on first login
    const password_hash = await bcrypt.hash(password, 10);
    user.password_hash = password_hash;
    db.write(data);
  }

  const valid = await bcrypt.compare(password, user.password_hash);
  if (!valid) {
    throw new Error('Incorrect password.');
  }

  const token = jwt.sign({ id: user.id, email: user.email }, JWT_SECRET, { expiresIn: JWT_EXPIRES });
  return { token, user: { id: user.id, email: user.email, name: user.name } };
}

export function verifyToken(token) {
  try {
    return jwt.verify(token, JWT_SECRET);
  } catch (e) {
    return null;
  }
}

// Express middleware — attaches req.user if valid token found
export function authMiddleware(req, res, next) {
  const authHeader = req.headers['authorization'];
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Unauthorized: No token provided.' });
  }
  const token = authHeader.substring(7);
  const decoded = verifyToken(token);
  if (!decoded) {
    return res.status(401).json({ error: 'Unauthorized: Invalid or expired token.' });
  }
  req.user = decoded;
  next();
}
