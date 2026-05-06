import { NextResponse } from 'next/server';

export async function GET() {
  return NextResponse.json({ name: 'parent', childId: 42 });
}
