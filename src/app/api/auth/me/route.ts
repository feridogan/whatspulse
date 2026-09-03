import { NextRequest, NextResponse } from 'next/server';
import { authenticateRequest } from '@/lib/auth';
import prisma from '@/lib/prisma';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  try {
    const authUser = await authenticateRequest(req);
    if (!authUser) {
      return NextResponse.json({ authenticated: false, user: null }, { status: 401 });
    }

    const dbUser = await prisma.user.findUnique({
      where: { id: authUser.id },
      select: { id: true, name: true, email: true, role: true, isActive: true },
    });

    let finalName = dbUser?.name || authUser.name || 'Feridun Doğan';
    if (finalName.includes('Sedat')) {
      finalName = 'Feridun Doğan';
    }

    const user = {
      id: dbUser?.id || authUser.id,
      name: finalName,
      email: dbUser?.email || authUser.email,
      role: dbUser?.role || authUser.role || 'ADMIN',
      isActive: dbUser?.isActive ?? true,
    };

    const response = NextResponse.json({
      authenticated: true,
      user,
    });

    response.headers.set('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate, max-age=0');
    return response;
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
