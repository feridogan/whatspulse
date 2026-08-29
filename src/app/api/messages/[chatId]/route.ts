import { NextRequest } from 'next/server';
import { GET as getMessages, POST as postMessage } from '@/app/api/inbox/chats/[phone]/messages/route';

export async function GET(req: NextRequest, { params }: { params: { chatId: string } }) {
  return getMessages(req, { params: { phone: params.chatId } });
}

export async function POST(req: NextRequest, { params }: { params: { chatId: string } }) {
  return postMessage(req, { params: { phone: params.chatId } });
}
