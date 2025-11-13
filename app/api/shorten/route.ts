import { NextRequest, NextResponse } from 'next/server';

// Simple base62 encoding for URL-safe short IDs
function generateShortId(url: string): string {
  const chars = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  
  // Create a simple hash from the URL
  let hash = 0;
  for (let i = 0; i < url.length; i++) {
    const char = url.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // Convert to 32-bit integer
  }
  
  // Convert to positive number
  hash = Math.abs(hash);
  
  // Convert to base62
  let result = '';
  do {
    result = chars[hash % chars.length] + result;
    hash = Math.floor(hash / chars.length);
  } while (hash > 0);
  
  // Ensure at least 6 characters
  while (result.length < 6) {
    result = 'a' + result;
  }
  
  return result.substring(0, 8); // Max 8 characters
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { url } = body;

    if (!url) {
      return NextResponse.json({ error: 'URL is required' }, { status: 400 });
    }

    const shortId = generateShortId(url);
    
    return NextResponse.json({ 
      shortId,
      shortUrl: `${new URL(request.url).origin}/${shortId}`,
      originalUrl: url // For debugging
    });
  } catch (error) {
    console.error('Shortener error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}