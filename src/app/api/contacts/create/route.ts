import { NextRequest } from 'next/server';
import { POST as handleContactPost } from '../route';

export async function POST(req: NextRequest) {
  return handleContactPost(req);
}
