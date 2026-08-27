import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const template = await prisma.template.findUnique({
      where: { id: params.id },
    });

    if (!template) {
      return NextResponse.json({ error: 'Şablon bulunamadı.' }, { status: 404 });
    }

    return NextResponse.json(template);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function PUT(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const body = await req.json();
    const { name, content, mediaType, mediaUrl, variables } = body;

    let extractedVariables = variables;
    if (content && (!variables || variables.length === 0)) {
      const matches = content.match(/\{(\w+)\}/g);
      if (matches) {
        extractedVariables = Array.from(new Set(matches.map((m: string) => m.replace(/[{}]/g, ''))));
      }
    }

    const updated = await prisma.template.update({
      where: { id: params.id },
      data: {
        name: name ? name.trim() : undefined,
        content: content ? content.trim() : undefined,
        mediaType: mediaType !== undefined ? mediaType : undefined,
        mediaUrl: mediaUrl !== undefined ? mediaUrl : undefined,
        variables: extractedVariables !== undefined ? extractedVariables : undefined,
      },
    });

    return NextResponse.json(updated);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    await prisma.template.delete({
      where: { id: params.id },
    });
    return NextResponse.json({ success: true, message: 'Şablon silindi.' });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
