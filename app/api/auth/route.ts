import { NextRequest, NextResponse } from 'next/server';
import { ACCESS_KEYS } from '@/lib/auth-keys';

export async function POST(req: NextRequest) {
  const { key } = await req.json();

  const role = ACCESS_KEYS[key?.trim().toUpperCase()];

  if (!role) {
    return NextResponse.json({ error: 'Chave de acesso inválida' }, { status: 401 });
  }

  return NextResponse.json({ role, key });
}
