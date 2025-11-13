import { NextRequest, NextResponse } from 'next/server';
import { createShortLink } from '@/lib/shortener';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { url } = body;

    if (!url) {
      return NextResponse.json({ error: 'URL is required' }, { status: 400 });
    }

    const shortId = createShortLink(url);
    
    return NextResponse.json({ 
      shortId,
      shortUrl: `${new URL(request.url).origin}/${shortId}`
    });
  } catch (error) {
    console.error('Shortener error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}