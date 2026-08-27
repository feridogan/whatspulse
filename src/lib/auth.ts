import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import { cookies } from 'next/headers';
import { NextRequest } from 'next/server';
import prisma from './prisma';

const JWT_SECRET = process.env.JWT_SECRET || 'whatspulse-super-secure-secret-key-2026';
const TOKEN_NAME = 'whatspulse_token';

export interface TokenPayload {
  userId: string;
  email: string;
  role: string;
  name: string;
}

export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, 10);
}

export async function comparePassword(password: string, hash: string): Promise<boolean> {
  return bcrypt.compare(password, hash);
}

export function signToken(payload: TokenPayload): string {
  return jwt.sign(payload, JWT_SECRET, { expiresIn: '30d' });
}

export function verifyToken(token: string): TokenPayload | null {
  try {
    return jwt.verify(token, JWT_SECRET) as TokenPayload;
  } catch {
    return null;
  }
}

export async function getSessionUser() {
  try {
    const cookieStore = cookies();
    const token = cookieStore.get(TOKEN_NAME)?.value;
    if (!token) return null;

    const payload = verifyToken(token);
    if (!payload?.userId) return null;

    const user = await prisma.user.findUnique({
      where: { id: payload.userId },
      select: { id: true, email: true, name: true, role: true },
    });

    return user;
  } catch {
    return null;
  }
}

export async function authenticateRequest(req: NextRequest) {
  const authHeader = req.headers.get('authorization');
  let token = authHeader?.startsWith('Bearer ') ? authHeader.substring(7) : null;

  if (!token) {
    token = req.cookies.get(TOKEN_NAME)?.value || null;
  }

  if (!token) return null;

  const payload = verifyToken(token);
  if (!payload?.userId) return null;

  return prisma.user.findUnique({
    where: { id: payload.userId },
    select: { id: true, email: true, name: true, role: true },
  });
}
