// Jackal Vault decryption helper module
// Based on the mount-file.js logic from Jackal Protocol
// Manual HTTP + crypto implementation (no Jackal SDK)

import { postAbciQuery, downloadEncryptedChunk } from '@/lib/jackalRpc';
import { createHash } from 'node:crypto';

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

interface DownloadAttempt {
  url: string;
  status?: number;
  error?: string;
}

/**
 * Fetch encrypted file chunks from storage provider
 * Based on DevTools inspection: GET /download/<chunkId>
 */
async function fetchEncryptedChunks(metadata: FileMetadata, fileId: string): Promise<Uint8Array> {
  try {
    console.log('📦 Finding storage providers and downloading chunks...');
    
    // Step 1: First we need to get the merkle hash from file metadata
    // The merkle hash is what's used in /download/<id>, not the ULID
    let merkleHex: string;
    
    // Try to extract merkle hash from metadata, or derive it
    if (metadata.rawResponse?.response?.value) {
      // Parse the file metadata response to get merkle hash
      const metadataDecoded = Buffer.from(metadata.rawResponse.response.value, 'base64');
      console.log('METADATA_DECODED', metadataDecoded.toString('hex'));
      // TODO: Parse protobuf to extract merkle hash field
    }
    
    // For now, let's generate a hash from the ULID as the DevTools pattern suggests
    // This should be replaced with actual merkle hash extraction from metadata
    merkleHex = createHash('sha256').update(fileId).digest('hex');
    
    console.log('ULID', fileId);
    console.log('DOWNLOAD_ID', merkleHex);
    
    // Step 2: Query FindFile to confirm this merkle hash exists
    console.log('🔍 Querying FindFile for merkle hash...');
    const findFileData = `0a20${merkleHex}`;
    const findFileResult = await postAbciQuery('/canine_chain.storage.Query/FindFile', findFileData);
    
    console.log('FIND_FILE_RESPONSE', JSON.stringify(findFileResult, null, 2));
    
    // Step 3: Get list of all storage providers
    console.log('🔍 Getting all storage providers...');
    const providersResult = await postAbciQuery('/canine_chain.storage.Query/AllProviders', '');
    
    console.log('ALL_PROVIDERS_RESPONSE', JSON.stringify(providersResult, null, 2));
    
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
    
    console.log('PROVIDERS', providerUrls);
    
    const downloadId = merkleHex; // Use merkle hash as download ID, not ULID
    
    // Step 4: Try downloading from multiple providers with detailed tracking
    const attempts: DownloadAttempt[] = [];
    
    for (const providerUrl of providerUrls) {
      const url = `${providerUrl}/download/${downloadId}`;
      console.log(`📦 Trying download from ${url}...`);
      
      try {
        const res = await fetch(url, {
          method: 'GET',
          headers: {
            'User-Agent': 'Shar3-Jackal-Client/1.0'
          }
        });
        
        attempts.push({ url, status: res.status });
        console.log(`📡 Response from ${url}: ${res.status} ${res.statusText}`);
        
        if (res.ok) {
          const arrayBuffer = await res.arrayBuffer();
          const data = new Uint8Array(arrayBuffer);
          console.log(`✅ Successfully downloaded ${data.length} bytes from ${url}`);
          return data;
        }
      } catch (err) {
        const errorMsg = err instanceof Error ? err.message : String(err);
        attempts.push({ url, error: errorMsg });
        console.log(`❌ Failed to download from ${url}:`, errorMsg);
      }
    }
    
    throw new Error(
      'Failed to download from any storage provider. Attempts: ' +
        JSON.stringify(attempts, null, 2)
    );
    
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