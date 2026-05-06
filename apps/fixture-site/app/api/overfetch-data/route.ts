import { NextResponse } from 'next/server';

export async function GET() {
  const payload: Record<string, unknown> = { name: 'Alice', age: 30, city: 'NYC' };
  for (let i = 4; i <= 50; i++) {
    payload[`field_${i}`] = `value-${i}`;
  }
  return NextResponse.json(payload);
}
