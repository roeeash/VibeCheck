import { NextResponse } from 'next/server';

export async function GET() {
  const records = Array.from({ length: 5000 }, (_, i) => ({
    id: i + 1,
    value: `record-${i + 1}`,
  }));
  return NextResponse.json(records);
}
