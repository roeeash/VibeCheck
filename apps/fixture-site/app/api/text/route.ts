import { NextResponse } from 'next/server';

export async function GET() {
  return NextResponse.json({ text: 'x'.repeat(200000) });
}
