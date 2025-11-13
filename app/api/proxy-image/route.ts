import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const imageUrl = searchParams.get('url');

  if (!imageUrl) {
    return new NextResponse('Missing image URL parameter', { status: 400 });
  }

  try {
    const decodedUrl = decodeURIComponent(imageUrl);
    
    // Fetch the Jackal Vault page server-side (same as social media crawlers do)
    const response = await fetch(decodedUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; Shar3Bot/1.0; +https://shar3.netlify.app)',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
      },
    });

    if (!response.ok) {
      return new NextResponse(`Failed to fetch: ${response.status}`, { status: response.status });
    }

    const contentType = response.headers.get('content-type') || '';
    
    // If it's already an image, proxy it directly
    if (contentType.startsWith('image/')) {
      const imageBuffer = await response.arrayBuffer();
      return new NextResponse(imageBuffer, {
        status: 200,
        headers: {
          'Content-Type': contentType,
          'Cache-Control': 'public, max-age=3600',
        },
      });
    }
    
    // If it's HTML (Jackal Vault), try to extract image URL from the page
    if (contentType.includes('text/html')) {
      const html = await response.text();
      
      // Look for image URLs in the HTML - try multiple patterns
      const patterns = [
        // Look for img tags with src
        /<img[^>]+src=["']([^"']+\.(jpg|jpeg|png|gif|webp|svg)[^"']*)["']/i,
        // Look for meta og:image tags
        /<meta[^>]+property=["']og:image["'][^>]+content=["']([^"']+)["']/i,
        // Look for background-image in style
        /background-image:\s*url\(["']?([^"')]+\.(jpg|jpeg|png|gif|webp)[^"')]*)/i,
      ];
      
      let imageMatch = null;
      for (const pattern of patterns) {
        imageMatch = html.match(pattern);
        if (imageMatch) break;
      }
      
      if (imageMatch && imageMatch[1]) {
        let imageUrl = imageMatch[1];
        
        // Make sure it's a full URL
        if (imageUrl.startsWith('/')) {
          const baseUrl = new URL(decodedUrl);
          imageUrl = `${baseUrl.protocol}//${baseUrl.host}${imageUrl}`;
        }
        
        try {
          // Fetch the actual image
          const imageResponse = await fetch(imageUrl, {
            headers: {
              'User-Agent': 'Mozilla/5.0 (compatible; Shar3Bot/1.0; +https://shar3.netlify.app)',
            },
          });
          
          if (imageResponse.ok) {
            const imageContentType = imageResponse.headers.get('content-type') || 'image/jpeg';
            if (imageContentType.startsWith('image/')) {
              const imageBuffer = await imageResponse.arrayBuffer();
              return new NextResponse(imageBuffer, {
                status: 200,
                headers: {
                  'Content-Type': imageContentType,
                  'Cache-Control': 'public, max-age=3600',
                },
              });
            }
          }
        } catch (error) {
          console.error('Failed to fetch extracted image:', error);
        }
      }
      
      // If we can't extract an image, return a placeholder
      return new NextResponse('No image found in HTML', { status: 404 });
    }

    // For other content types, return error
    return new NextResponse('Not an image or HTML page', { status: 400 });

  } catch (error) {
    console.error('Proxy error:', error);
    return new NextResponse('Failed to proxy image', { status: 500 });
  }
}