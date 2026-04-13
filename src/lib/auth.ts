import jwt from 'jsonwebtoken';
import { hashSync, compareSync } from 'bcryptjs';

const JWT_SECRET = process.env.SIGAA_JWT_SECRET || 'sigaa-secret-key-2026';
const TOKEN_EXPIRY = '24h';

export interface TokenPayload {
  id: number;
  username: string;
  nombre: string;
  rol: string;
}

export function signToken(payload: TokenPayload): string {
  return jwt.sign(payload, JWT_SECRET, { expiresIn: TOKEN_EXPIRY });
}

export function verifyToken(token: string): TokenPayload | null {
  try {
    const decoded = jwt.verify(token, JWT_SECRET) as TokenPayload;
    return decoded;
  } catch {
    return null;
  }
}

export function hashPassword(password: string): string {
  return hashSync(password, 10);
}

export function comparePassword(password: string, hash: string): boolean {
  return compareSync(password, hash);
}
