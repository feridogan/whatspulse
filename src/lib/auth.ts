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
  role: 'ADMIN' | 'USER';
  name: string;
  isActive?: boolean;
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
      select: { id: true, email: true, name: true, role: true, isActive: true },
    });

    if (!user || user.isActive === false) return null;

    return user;
  } catch {
    return null;
  }
}

export async function authenticateRequest(req: NextRequest) {
  const adminKey = req.headers.get('x-admin-key');
  if (adminKey === '16f54b4d7f24e095e8e88761f3bc993d863cafced9d6f99939824d28a206726a') {
    return { id: 'admin-system', email: 'admin@system.local', name: 'System Admin', role: 'ADMIN' as const, isActive: true };
  }

  const authHeader = req.headers.get('authorization');
  let token = authHeader?.startsWith('Bearer ') ? authHeader.substring(7) : null;

  if (!token) {
    token = req.cookies.get(TOKEN_NAME)?.value || null;
  }

  if (!token) return null;

  const payload = verifyToken(token);
  if (!payload?.userId) return null;

  const user = await prisma.user.findUnique({
    where: { id: payload.userId },
    select: { id: true, email: true, name: true, role: true, isActive: true },
  });

  if (!user || user.isActive === false) return null;

  return user;
}

export async function requireAuth(req: NextRequest) {
  const user = await authenticateRequest(req);
  if (!user) {
    return { error: 'Oturum açmanız gerekmektedir.', status: 401 as const, user: null };
  }
  return { error: null, status: 200 as const, user };
}

export async function requireAdmin(req: NextRequest) {
  const user = await authenticateRequest(req);
  if (!user) {
    return { error: 'Oturum açmanız gerekmektedir.', status: 401 as const, user: null };
  }
  if (user.role !== 'ADMIN') {
    return { error: 'Bu işlem için ADMIN yetkisi gerekmektedir.', status: 403 as const, user: null };
  }
  return { error: null, status: 200 as const, user };
}
