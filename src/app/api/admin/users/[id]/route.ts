import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { requireAdmin, hashPassword } from '@/lib/auth';
import { Role } from '@prisma/client';

// PATCH /api/admin/users/[id] - Update user details or password
export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const authCheck = await requireAdmin(req);
    if (authCheck.error) {
      return NextResponse.json({ error: authCheck.error }, { status: authCheck.status });
    }

    const { id } = params;
    const body = await req.json();
    const { name, email, password, role, isActive } = body;

    const existing = await prisma.user.findUnique({ where: { id } });
    if (!existing) {
      return NextResponse.json({ error: 'Kullanıcı bulunamadı.' }, { status: 404 });
    }

    const updateData: any = {};

    if (name) updateData.name = name.trim();
    if (role && (role === 'ADMIN' || role === 'USER')) {
      // Prevent removing the last admin or changing own role
      if (authCheck.user?.id === id && role !== 'ADMIN') {
        return NextResponse.json(
          { error: 'Kendi yöneticilik rolünüzü değiştiremezsiniz.' },
          { status: 400 }
        );
      }
      updateData.role = role === 'ADMIN' ? Role.ADMIN : Role.USER;
    }

    if (typeof isActive === 'boolean') {
      if (authCheck.user?.id === id && !isActive) {
        return NextResponse.json(
          { error: 'Kendi hesabınızı pasife alamazsınız.' },
          { status: 400 }
        );
      }
      updateData.isActive = isActive;
    }

    if (email) {
      const normalizedEmail = email.toLowerCase().trim();
      if (normalizedEmail !== existing.email) {
        const emailExists = await prisma.user.findUnique({
          where: { email: normalizedEmail },
        });
        if (emailExists) {
          return NextResponse.json(
            { error: 'Bu e-posta adresi başka bir kullanıcı tarafından kullanılıyor.' },
            { status: 409 }
          );
        }
        updateData.email = normalizedEmail;
      }
    }

    if (password) {
      if (password.length < 6) {
        return NextResponse.json(
          { error: 'Yeni şifre en az 6 karakter olmalıdır.' },
          { status: 400 }
        );
      }
      updateData.password = await hashPassword(password);
    }

    const updatedUser = await prisma.user.update({
      where: { id },
      data: updateData,
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        isActive: true,
        updatedAt: true,
      },
    });

    return NextResponse.json({
      success: true,
      message: 'Kullanıcı bilgileri güncellendi.',
      user: updatedUser,
    });
  } catch (error: any) {
    console.error('Error updating user:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// DELETE /api/admin/users/[id] - Delete a user
export async function DELETE(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const authCheck = await requireAdmin(req);
    if (authCheck.error) {
      return NextResponse.json({ error: authCheck.error }, { status: authCheck.status });
    }

    const { id } = params;

    // Prevent admin from deleting themselves
    if (authCheck.user?.id === id) {
      return NextResponse.json(
        { error: 'Kendi hesabınızı silemezsiniz.' },
        { status: 400 }
      );
    }

    const existing = await prisma.user.findUnique({ where: { id } });
    if (!existing) {
      return NextResponse.json({ error: 'Kullanıcı bulunamadı.' }, { status: 404 });
    }

    await prisma.user.delete({ where: { id } });

    return NextResponse.json({
      success: true,
      message: 'Kullanıcı başarıyla silindi.',
    });
  } catch (error: any) {
    console.error('Error deleting user:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
