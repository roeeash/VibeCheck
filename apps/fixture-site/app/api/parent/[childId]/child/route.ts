import { NextResponse } from 'next/server';

export async function GET(_req: Request, { params }: { params: { childId: string } }) {
  return NextResponse.json({ name: 'child', grandchildId: 99 });
}
