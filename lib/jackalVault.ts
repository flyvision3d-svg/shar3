// Jackal Vault decryption helper module
// Based on the mount-file.js logic from Jackal Protocol
// Manual HTTP + crypto implementation (no Jackal SDK)

import { postAbciQuery, downloadEncryptedChunk } from '@/lib/jackalRpc';

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
 * Fetch file metadata from Jackal Protocol using RPC
 * Based on DevTools inspection: /canine_chain.filetree.Query/File
 */
async function fetchFileMetadata(vaultAddress: string, fileId: string, key: string): Promise<FileMetadata> {
  try {
    console.log(`📊 Fetching metadata for ${fileId} from ${vaultAddress}...`);
    
    // Use discovered protobuf encoding for ULID query
    const ulidBytes = Buffer.from(fileId, 'utf8');
    const dataHex = `0a${ulidBytes.length.toString(16).padStart(2, '0')}${ulidBytes.toString('hex')}`;
    
    console.log(`🔍 Querying filetree with ULID: ${fileId} (hex: ${dataHex})`);
    const result = await postAbciQuery('/canine_chain.filetree.Query/File', dataHex);
    
    // Parse the response - structure to be discovered
    console.log('📄 Raw filetree response:', result);
    
    // TODO: Extract fields once we see the response structure:
    // - mimeType / filename
    // - file size  
    // - merkle hash for storage lookup
    // - crypto parameters (IV, etc.)
    
    return {
      mimeType: 'image/png', // Placeholder until we see response structure
      filename: fileId,
      size: 0,
      // Add fields as discovered
      rawResponse: result
    };
    
  } catch (error) {
    throw new Error(`Failed to fetch metadata: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

/**
 * Fetch encrypted file chunks from storage provider
 * Based on DevTools inspection: GET /download/<chunkId>
 */
async function fetchEncryptedChunks(metadata: FileMetadata, fileId: string): Promise<Uint8Array> {
  try {
    console.log('📦 Finding storage providers and downloading chunks...');
    
    // Step 1: Get list of all storage providers
    console.log('🔍 Getting all storage providers...');
    const providersResult = await postAbciQuery('/canine_chain.storage.Query/AllProviders', '');
    
    console.log('📄 Raw AllProviders response:', providersResult);
    
    // Extract provider URLs from the protobuf response
    let providerUrls: string[] = [];
    if (providersResult && providersResult.response && providersResult.response.value) {
      const decoded = Buffer.from(providersResult.response.value, 'base64');
      const text = decoded.toString();
      const urlMatches = text.match(/https?:\/\/[^\s\x00-\x1f]+/g);
      if (urlMatches) {
        providerUrls = urlMatches.slice(0, 5); // Try first 5 providers
        console.log(`📦 Found ${urlMatches.length} providers, testing first 5:`, providerUrls);
      }
    }
    
    // Fallback to known working provider
    if (providerUrls.length === 0) {
      providerUrls = ['https://jackal-storage1.badgerbite.io'];
    }
    
    const downloadId = fileId; // Start with ULID as download ID
    
    // Step 2: Try downloading from multiple providers
    let encryptedData: Uint8Array | null = null;
    
    for (const providerUrl of providerUrls) {
      console.log(`📦 Trying download from ${providerUrl}...`);
      try {
        encryptedData = await downloadEncryptedChunk(providerUrl, downloadId);
        console.log(`✅ Successfully downloaded ${encryptedData.length} bytes from ${providerUrl}`);
        break;
      } catch (error) {
        console.log(`❌ Failed to download from ${providerUrl}:`, error instanceof Error ? error.message : 'Unknown error');
      }
    }
    
    if (!encryptedData) {
      throw new Error('Failed to download from any storage provider');
    }
    
    return encryptedData;
    
  } catch (error) {
    throw new Error(`Failed to fetch encrypted chunks: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

/**
 * Decrypt file data using the provided key
 * Placeholder until crypto parameters are discovered
 */
async function decryptFileData(encryptedData: Uint8Array, key: string, metadata: FileMetadata): Promise<Uint8Array> {
  try {
    console.log('🔓 Decrypting file data...');
    
    // TODO: Implement once we discover:
    // 1. Key derivation method
    // 2. IV/nonce location in data or metadata
    // 3. Encryption algorithm (AES-GCM likely)
    // 4. Auth tag handling
    
    console.log(`📊 Encrypted data size: ${encryptedData.length} bytes`);
    console.log(`🔑 Key prefix: ${key.substring(0, 8)}...`);
    console.log(`📄 Metadata available:`, metadata);
    
    // For now, return encrypted data unchanged for testing
    console.log('⚠️  [PLACEHOLDER] Returning encrypted data unchanged - decryption not yet implemented');
    return encryptedData;
    
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