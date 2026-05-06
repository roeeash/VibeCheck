import { NextResponse } from 'next/server';

export async function GET() {
  const response = NextResponse.json({
    appName: 'VibeCheck Fixture',
    version: '1.0.0',
    featureFlags: { darkMode: true, beta: false },
    apiEndpoint: 'https://api.example.com/v1',
  });

  response.headers.delete('Cache-Control');
  response.headers.delete('ETag');
  response.headers.set('Pragma', 'no-cache');
  response.headers.set('Expires', '0');

  return response;
}
