import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { EvolutionService } from '@/lib/evolution';

export async function GET() {
  try {
    let groups = await prisma.group.findMany({
      include: {
        _count: {
          select: { contacts: true },
        },
      },
      orderBy: { name: 'asc' },
    });

    // If groups table is empty, auto-fetch from Evolution API
    if (groups.length === 0) {
      try {
        const [rawGroups, rawChats] = await Promise.all([
          EvolutionService.fetchGroups(),
          EvolutionService.fetchChats(),
        ]);

        const allCandidates = [...rawGroups];
        for (const ch of rawChats) {
          const jid = String(ch.id || ch.remoteJid || ch.jid || '');
          if (jid.includes('@g.us')) {
            allCandidates.push(ch);
          }
        }

        const cleanGroups: Array<{ name: string; description: string; color: string }> = [];
        const seenNames = new Map<string, boolean>();
        const seenJids = new Map<string, boolean>();

        for (const g of allCandidates) {
          const jid = String(g.id || g.remoteJid || g.jid || '').trim();
          if (!jid || !jid.includes('@g.us')) continue;
          if (seenJids.has(jid)) continue;
          seenJids.set(jid, true);

          let gName = (g.subject || g.name || '').trim();
          if (!gName) gName = `WhatsApp Grubu (${jid.slice(0, 8)})`;
          if (seenNames.has(gName.toLowerCase())) {
            gName = `${gName} (${jid.slice(-4)})`;
          }
          seenNames.set(gName.toLowerCase(), true);

          const memberCount = Number(g.size || (g.participants ? g.participants.length : 0)) || 0;
          const sizeText = memberCount > 0 ? ` (${memberCount} Katılımcı)` : '';

          cleanGroups.push({
            name: gName,
            description: `WhatsApp Grubu${sizeText} - JID: ${jid}`,
            color: '#128C7E',
          });
        }

        if (cleanGroups.length > 0) {
          await prisma.group.createMany({ data: cleanGroups, skipDuplicates: true });
          groups = await prisma.group.findMany({
            include: {
              _count: {
                select: { contacts: true },
              },
            },
            orderBy: { name: 'asc' },
          });
        }
      } catch (err) {
        console.warn('[Groups Auto-Fetch Warning]:', err);
      }
    }

    return NextResponse.json(groups);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const { name, description, color } = await req.json();

    if (!name) {
      return NextResponse.json({ error: 'Grup adı zorunludur.' }, { status: 400 });
    }

    const group = await prisma.group.create({
      data: {
        name: name.trim(),
        description: description || null,
        color: color || '#10b981',
      },
    });

    return NextResponse.json(group, { status: 201 });
  } catch (error: any) {
    if (error.code === 'P2002') {
      return NextResponse.json({ error: 'Bu isimde bir grup zaten mevcut.' }, { status: 400 });
    }
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
