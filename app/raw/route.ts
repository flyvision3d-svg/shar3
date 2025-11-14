import { NextRequest, NextResponse } from 'next/server';
import { fetchAndDecryptVaultFile } from '@/lib/jackalVault';

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const encodedVaultUrl = searchParams.get('u');

  // Input validation
  if (!encodedVaultUrl) {
    return new NextResponse('Missing vault URL parameter "u"', { 
      status: 400,
      headers: { 'Content-Type': 'text/plain' }
    });
  }

  try {
    // Decode the vault URL (assume URL encoding for now)
    const vaultUrl = decodeURIComponent(encodedVaultUrl);
    
    // Validate it's a Jackal Vault URL
    if (!vaultUrl.includes('vault.jackalprotocol.com')) {
      return new NextResponse('Invalid vault URL domain', { 
        status: 400,
        headers: { 'Content-Type': 'text/plain' }
      });
    }

    console.log('🔥 Processing Jackal Vault file:', vaultUrl.substring(0, 100) + '...');

    // Fetch and decrypt the file
    const { mimeType, data } = await fetchAndDecryptVaultFile(vaultUrl);

    console.log(`✅ Successfully decrypted ${data.length} bytes, MIME: ${mimeType}`);

    // Stream the decrypted file back
    // Convert Uint8Array to Buffer for NextResponse
    const buffer = Buffer.from(data);
    
    const response = new NextResponse(buffer, {
      status: 200,
      headers: {
        'Content-Type': mimeType,
        'Cache-Control': 'public, max-age=3600',
        'Content-Length': data.length.toString(),
        'Access-Control-Allow-Origin': '*', // Allow cross-origin for OG crawlers
      },
    });

    return response;

  } catch (error) {
    console.error('❌ Raw file proxy error:', error);

    // Determine appropriate error response
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    
    if (errorMessage.includes('not found') || errorMessage.includes('404')) {
      return new NextResponse('File not found or cannot be decrypted', { 
        status: 404,
        headers: { 'Content-Type': 'text/plain' }
      });
    }
    
    if (errorMessage.includes('timeout') || errorMessage.includes('network')) {
      return new NextResponse('Upstream service unavailable', { 
        status: 502,
        headers: { 'Content-Type': 'text/plain' }
      });
    }
    
    if (errorMessage.includes('decrypt') || errorMessage.includes('key')) {
      return new NextResponse('Decryption failed - invalid key or corrupted file', { 
        status: 422,
        headers: { 'Content-Type': 'text/plain' }
      });
    }

    // Generic server error
    return new NextResponse('Internal server error during file processing', { 
      status: 500,
      headers: { 'Content-Type': 'text/plain' }
    });
  }
}