// Jackal Vault decryption helper module
// Based on the mount-file.js logic from Jackal Protocol
// Manual HTTP + crypto implementation (no Jackal SDK)

// Crypto setup for Node.js environment
let subtle: SubtleCrypto;
if (typeof globalThis !== 'undefined' && globalThis.crypto?.subtle) {
  subtle = globalThis.crypto.subtle;
} else {
  // Fallback for Node.js
  const { webcrypto } = require('node:crypto');
  subtle = webcrypto.subtle;
}

interface VaultUrlParts {
  vaultAddress: string;
  fileId: string;
  key: string;
}

export interface JackalDecryptedFile {
  mimeType: string;
  data: Uint8Array;
}

interface FileMetadata {
  mimeType?: string;
  filename?: string;
  size?: number;
  providerUrl?: string;
  // Add more fields based on mount-file.js analysis
  [key: string]: any;
}

/**
 * Parse a Jackal Vault share URL into its components
 * Example: https://vault.jackalprotocol.com/v/jkl1.../FILEID?k=KEY
 */
export function parseVaultUrl(vaultUrl: string): VaultUrlParts {
  try {
    const url = new URL(vaultUrl);
    
    // Extract path: /v/{vaultAddress}/{fileId}
    const pathParts = url.pathname.split('/');
    if (pathParts.length < 4 || pathParts[1] !== 'v') {
      throw new Error('Invalid vault URL format');
    }
    
    const vaultAddress = pathParts[2];
    const fileId = pathParts[3];
    const key = url.searchParams.get('k');
    
    if (!vaultAddress || !fileId || !key) {
      throw new Error('Missing required URL components');
    }
    
    return { vaultAddress, fileId, key };
  } catch (error) {
    throw new Error(`Failed to parse vault URL: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}


/**
 * Determine MIME type from file metadata or filename
 */
function getMimeType(metadata: any, filename?: string): string {
  // Try to determine from metadata first
  if (metadata?.mimeType) {
    return metadata.mimeType;
  }
  
  // Fall back to extension-based detection
  if (filename) {
    const ext = filename.toLowerCase().split('.').pop();
    switch (ext) {
      case 'jpg':
      case 'jpeg':
        return 'image/jpeg';
      case 'png':
        return 'image/png';
      case 'gif':
        return 'image/gif';
      case 'webp':
        return 'image/webp';
      case 'svg':
        return 'image/svg+xml';
      default:
        return 'image/png'; // Default fallback
    }
  }
  
  return 'image/png'; // Default fallback
}

/**
 * Fetch file metadata from Jackal Protocol API
 * Based on mount-file.js metadata fetching logic
 */
async function fetchFileMetadata(vaultAddress: string, fileId: string, key: string): Promise<FileMetadata> {
  try {
    console.log(`📊 Fetching metadata for ${fileId}...`);
    
    // TODO: Implement based on mount-file.js - need the actual API endpoints and request format
    // Example expectation based on mount-file.js:
    // const response = await fetch(`https://api.jackalprotocol.com/jackal/storage/files/${fileId}`, {
    //   headers: { /* auth headers if needed */ }
    // });
    
    // For now, throw with clear placeholder message
    throw new Error(`[PLACEHOLDER] fetchFileMetadata not implemented - need mount-file.js API call details for metadata. Trying to fetch: ${vaultAddress}/${fileId}`);
    
  } catch (error) {
    throw new Error(`Failed to fetch metadata: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

/**
 * Fetch encrypted file chunks from storage provider
 * Based on mount-file.js chunk fetching logic
 */
async function fetchEncryptedChunks(metadata: FileMetadata, fileId: string): Promise<Uint8Array> {
  try {
    console.log('📦 Fetching encrypted chunks...');
    
    // TODO: Implement based on mount-file.js - need provider URL and download endpoint
    // Example expectation:
    // const response = await fetch(`${metadata.providerUrl}/download/${fileId}`, {
    //   method: 'GET'
    // });
    // const encryptedData = await response.arrayBuffer();
    // return new Uint8Array(encryptedData);
    
    throw new Error(`[PLACEHOLDER] fetchEncryptedChunks not implemented - need mount-file.js provider URL and download logic for ${fileId}`);
    
  } catch (error) {
    throw new Error(`Failed to fetch encrypted chunks: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

/**
 * Decrypt file data using the provided key
 * Based on mount-file.js crypto logic
 */
async function decryptFileData(encryptedData: Uint8Array, key: string, metadata: FileMetadata): Promise<Uint8Array> {
  try {
    console.log('🔓 Decrypting file data...');
    
    // TODO: Implement based on mount-file.js crypto details:
    // 1. Key derivation from 'key' parameter
    // 2. IV/nonce extraction 
    // 3. Algorithm parameters (AES-GCM, AES-CBC, etc.)
    // 4. Auth tag handling
    // 
    // Example expectation:
    // const cryptoKey = await subtle.importKey('raw', keyBytes, { name: 'AES-GCM' }, false, ['decrypt']);
    // const decrypted = await subtle.decrypt({ name: 'AES-GCM', iv: ivBytes }, cryptoKey, encryptedData);
    // return new Uint8Array(decrypted);
    
    throw new Error(`[PLACEHOLDER] decryptFileData not implemented - need mount-file.js crypto algorithm and key derivation details. Key: ${key.substring(0, 8)}..., Data size: ${encryptedData.length}`);
    
  } catch (error) {
    throw new Error(`Failed to decrypt file: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

/**
 * Main function to fetch and decrypt a Jackal Vault file
 * Manual HTTP + crypto implementation without Jackal SDK
 * 
 * @param vaultUrl - Full Jackal Vault share URL
 * @returns Promise resolving to decrypted file data and MIME type
 */
export async function fetchAndDecryptVaultFile(vaultUrl: string): Promise<JackalDecryptedFile> {
  try {
    console.log('📥 Parsing vault URL...');
    const { vaultAddress, fileId, key } = parseVaultUrl(vaultUrl);
    
    console.log('📊 Fetching file metadata...');
    const metadata = await fetchFileMetadata(vaultAddress, fileId, key);
    
    console.log('📦 Fetching encrypted chunks...');
    const encryptedData = await fetchEncryptedChunks(metadata, fileId);
    
    console.log('🔓 Decrypting file...');
    const decryptedData = await decryptFileData(encryptedData, key, metadata);
    
    console.log('✅ File decrypted successfully');
    const mimeType = getMimeType(metadata, metadata.filename);
    
    return {
      mimeType,
      data: decryptedData
    };
    
  } catch (error) {
    console.error('❌ Failed to fetch and decrypt vault file:', error);
    throw error;
  }
}

// Export utility functions for testing
export { parseVaultUrl as _parseVaultUrl };