import { NextResponse } from 'next/server';

export async function GET(_req: Request, { params }: { params: { grandchildId: string } }) {
  return NextResponse.json({ name: 'grandchild', details: 'deep' });
}
