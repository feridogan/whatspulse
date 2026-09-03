import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { comparePassword, hashPassword, signToken } from '@/lib/auth';
import { ensureDbSchemaSync } from '@/lib/db-sync';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  try {
    await ensureDbSchemaSync();
    const { email, password } = await req.json();

    if (!email || !password) {
      return NextResponse.json({ error: 'E-posta ve şifre gereklidir.' }, { status: 400 });
    }

    const cleanEmail = email.toLowerCase().trim();

    // Check if any user exists in DB, if not auto-seed default admin
    const userCount = await prisma.user.count();
    if (userCount === 0) {
      const defaultHash = await hashPassword('Admin123!');
      await prisma.user.create({
        data: {
          email: 'admin@whatspulse.com',
          name: 'Feridun Doğan',
          password: defaultHash,
          role: 'ADMIN',
          isActive: true
        }
      });
    } else {
      // Ensure default admin name is Feridun Doğan
      await prisma.user.updateMany({
        where: { name: 'Sedat Bayraklı' },
        data: { name: 'Feridun Doğan' }
      });
    }

    let user = await prisma.user.findUnique({
      where: { email: cleanEmail },
    });

    if (!user) {
      return NextResponse.json({ error: 'Geçersiz e-posta veya şifre.' }, { status: 401 });
    }

    const isValid = await comparePassword(password, user.password);
    if (!isValid) {
      return NextResponse.json({ error: 'Geçersiz e-posta veya şifre.' }, { status: 401 });
    }

    if (user.isActive === false) {
      return NextResponse.json({ error: 'Hesabınız askıya alınmıştır veya pasif durumdadır.' }, { status: 403 });
    }

    const tokenPayload = {
      userId: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
      isActive: user.isActive,
    };

    const token = signToken(tokenPayload);

    const response = NextResponse.json({
      success: true,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
        isActive: user.isActive,
      },
      token,
    });

    response.cookies.set('whatspulse_token', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
      maxAge: 30 * 24 * 60 * 60, // 30 days
    });

    return response;
  } catch (error: any) {
    console.error('Login error:', error);
    return NextResponse.json({ error: 'Giriş yapılamadı: ' + error.message }, { status: 500 });
  }
}
