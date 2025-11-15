import { NextRequest, NextResponse } from 'next/server';

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

  // Decode the vault URL
  const vaultUrl = decodeURIComponent(encodedVaultUrl);
  
  // Validate it's a Jackal Vault URL
  if (!vaultUrl.includes('vault.jackalprotocol.com')) {
    return new NextResponse('Invalid vault URL domain', { 
      status: 400,
      headers: { 'Content-Type': 'text/plain' }
    });
  }

  // Server-side Jackal decryption is not implemented
  // All Jackal files are now handled client-side via jackal.js
  return new NextResponse(
    'Jackal raw hosting not implemented yet. ' +
    'Jackal files are now decrypted client-side for better performance and security.',
    { 
      status: 501,
      headers: { 'Content-Type': 'text/plain' }
    }
  );
}