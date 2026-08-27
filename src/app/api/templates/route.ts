import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

export async function GET() {
  try {
    const templates = await prisma.template.findMany({
      orderBy: { createdAt: 'desc' },
    });
    return NextResponse.json(templates);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { name, content, mediaType, mediaUrl, variables } = body;

    if (!name || !content) {
      return NextResponse.json({ error: 'Şablon adı ve mesaj içeriği zorunludur.' }, { status: 400 });
    }

    // Extract dynamic variables from content if not provided
    let extractedVariables = Array.isArray(variables) ? variables : [];
    if (extractedVariables.length === 0) {
      const matches = content.match(/\{(\w+)\}/g);
      if (matches) {
        extractedVariables = Array.from(new Set(matches.map((m: string) => m.replace(/[{}]/g, ''))));
      }
    }

    const template = await prisma.template.create({
      data: {
        name: name.trim(),
        content: content.trim(),
        mediaType: mediaType || 'text',
        mediaUrl: mediaUrl || null,
        variables: extractedVariables,
      },
    });

    return NextResponse.json(template, { status: 201 });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
