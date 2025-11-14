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
    
    // Step 1: Generate CID (content identifier) from ULID
    // Based on DevTools analysis, this is the merkle hash used in /download/<cid>
    const cid = createHash('sha256').update(fileId).digest('hex');
    
    console.log('ULID', fileId);
    console.log('CID', cid);
    
    const attempts: DownloadAttempt[] = [];
    const PRIMARY_STORAGE_HOST = "jkstorage4.squirrellogic.com";
    
    // Step 2: Try primary gateway first (known working from DevTools)
    const primaryUrl = `https://${PRIMARY_STORAGE_HOST}/download/${cid}`;
    console.log(`📦 Trying primary storage: ${primaryUrl}`);
    
    try {
      const res = await fetch(primaryUrl, {
        method: 'GET',
        headers: {
          'User-Agent': 'Shar3-Jackal-Client/1.0'
        }
      });
      
      attempts.push({ url: primaryUrl, status: res.status });
      console.log(`📡 Primary response: ${res.status} ${res.statusText}`);
      
      if (res.ok) {
        const arrayBuffer = await res.arrayBuffer();
        const data = new Uint8Array(arrayBuffer);
        console.log(`✅ Successfully downloaded ${data.length} bytes from primary storage`);
        return data;
      } else {
        const body = await res.text().catch(() => "");
        attempts[attempts.length - 1].error = body || `status ${res.status}`;
        console.log(`❌ Primary storage failed: ${res.status}. Body: ${body}`);
      }
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : String(err);
      attempts.push({ url: primaryUrl, error: errorMsg });
      console.log(`❌ Primary storage error:`, errorMsg);
    }
    
    // Step 3: Fallback to other providers if primary fails
    const fallbackHosts = [
      "pod-04.jackalstorage.online",
      "pod-01.jackalstorage.online", 
      "m4.jkldrive.com",
      "jackal-storage1.badgerbite.io",
      "jsn4.pegasusdev.xyz",
    ];
    
    console.log(`📦 Primary failed, trying ${fallbackHosts.length} fallback providers...`);
    
    for (const host of fallbackHosts) {
      const url = `https://${host}/download/${cid}`;
      console.log(`📦 Trying fallback: ${url}`);
      
      try {
        const res = await fetch(url, {
          method: 'GET',
          headers: {
            'User-Agent': 'Shar3-Jackal-Client/1.0'
          }
        });
        
        attempts.push({ url, status: res.status });
        console.log(`📡 Fallback response from ${host}: ${res.status} ${res.statusText}`);
        
        if (res.ok) {
          const arrayBuffer = await res.arrayBuffer();
          const data = new Uint8Array(arrayBuffer);
          console.log(`✅ Successfully downloaded ${data.length} bytes from fallback: ${host}`);
          return data;
        } else {
          const body = await res.text().catch(() => "");
          attempts[attempts.length - 1].error = body || `status ${res.status}`;
          console.log(`❌ Fallback ${host} failed: ${res.status}. Body: ${body}`);
        }
      } catch (err) {
        const errorMsg = err instanceof Error ? err.message : String(err);
        attempts.push({ url, error: errorMsg });
        console.log(`❌ Fallback ${host} error:`, errorMsg);
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