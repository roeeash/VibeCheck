import { NextResponse } from 'next/server';

export async function GET(_req: Request, { params }: { params: { id: string } }) {
  return NextResponse.json({
    userId: Number(params.id),
    bio: `Bio for user ${params.id}`,
    avatar: `/avatars/${params.id}.png`,
    joined: '2023-01-15',
  });
}
