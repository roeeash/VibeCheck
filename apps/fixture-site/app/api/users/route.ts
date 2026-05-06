import { NextResponse } from 'next/server';

export async function GET() {
  const users = Array.from({ length: 47 }, (_, i) => ({
    id: i + 1,
    name: `user-${i + 1}`,
  }));
  return NextResponse.json(users);
}
