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
 * Helper function to collect all hex string candidates from an object
 * Useful for finding CID fields in protobuf responses
 */
function collectHexCandidates(obj: any, path: string[] = [], out: string[] = []): string[] {
  if (!obj || typeof obj !== 'object') return out;
  for (const [key, val] of Object.entries(obj)) {
    const nextPath = [...path, key];
    if (typeof val === 'string' && /^[0-9a-f]{64}$/i.test(val)) {
      out.push(`${nextPath.join('.')} = ${val}`);
    } else if (Array.isArray(val)) {
      val.forEach((item, idx) => collectHexCandidates(item, [...nextPath, String(idx)], out));
    } else if (typeof val === 'object') {
      collectHexCandidates(val, nextPath, out);
    }
  }
  return out;
}

/**
 * Decode FindFile protobuf response value
 * For now, just decode the base64 and log raw bytes until we have proper protobuf types
 */
function decodeFindFileValue(response: any): any {
  const valueB64 = response?.result?.response?.value;
  if (!valueB64) {
    throw new Error('FindFile response missing value');
  }

  const raw = Buffer.from(valueB64, 'base64');
  console.log('FIND_FILE_RAW_BYTES', raw.toString('hex'));
  
  // TODO: Use proper protobuf decoding once we have the schema
  // For now, try to parse as simple fields and log everything we can
  
  // Try to extract potential string fields (protobuf strings are length-prefixed)
  const potentialStrings = [];
  for (let i = 0; i < raw.length - 1; i++) {
    const len = raw[i];
    if (len > 0 && len < 100 && i + 1 + len <= raw.length) {
      const str = raw.slice(i + 1, i + 1 + len).toString('utf8');
      if (/^[0-9a-f]+$/i.test(str) && str.length >= 32) {
        potentialStrings.push({ offset: i, length: len, value: str });
      }
    }
  }
  
  const decoded = {
    rawBytes: raw.toString('hex'),
    length: raw.length,
    firstBytes: raw.slice(0, 32).toString('hex'),
    lastBytes: raw.slice(-32).toString('hex'),
    potentialHexStrings: potentialStrings,
    // Try to find 32-byte sequences that might be hashes
    possibleHashes: [] as Array<{ offset: number; hash: string }>,
  };
  
  // Look for 32-byte sequences that might be hashes/CIDs
  for (let i = 0; i <= raw.length - 32; i++) {
    const hash = raw.slice(i, i + 32).toString('hex');
    if (/^[0-9a-f]{64}$/i.test(hash)) {
      decoded.possibleHashes.push({ offset: i, hash });
    }
  }

  console.log('FIND_FILE_DECODED', JSON.stringify(decoded, null, 2));
  return decoded;
}

/**
 * Query FindFile RPC to get the actual CID for storage download
 */
async function getFindFileInfo(fileId: string): Promise<any> {
  try {
    console.log(`🔍 Querying FindFile for: ${fileId}`);
    
    // Build the protobuf query for FindFile
    // Based on Jackal SDK usage, this should be the merkle hash or file identifier
    const fileIdBytes = Buffer.from(fileId, 'utf8');
    const dataHex = `0a${fileIdBytes.length.toString(16).padStart(2, '0')}${fileIdBytes.toString('hex')}`;
    
    console.log(`🔍 FindFile query hex: ${dataHex}`);
    
    const path = '/canine_chain.storage.Query/FindFile';
    const response = await postAbciQuery(path, dataHex);
    
    console.log('FIND_FILE_RESPONSE_RAW', JSON.stringify(response, null, 2));
    
    // Decode the response
    const decoded = decodeFindFileValue(response);
    
    // Look for hex candidates that might be the CID
    const candidates = collectHexCandidates(response);
    console.log('FIND_FILE_HEX_CANDIDATES', candidates);
    
    return { response, decoded, candidates };
    
  } catch (error) {
    console.error('❌ FindFile query failed:', error);
    throw new Error(`Failed to query FindFile: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

/**
 * Fetch encrypted file chunks from storage provider
 * Based on DevTools inspection: GET /download/<chunkId>
 */
async function fetchEncryptedChunks(metadata: FileMetadata, fileId: string): Promise<Uint8Array> {
  try {
    console.log('📦 Finding storage providers and downloading chunks...');
    
    // Step 1: Query FindFile to get the actual CID
    console.log('🔍 Querying FindFile for correct CID...');
    const findFileInfo = await getFindFileInfo(fileId);
    
    // Extract CID from FindFile response
    // TODO: Update this path once we identify the correct field from the logs
    let cid: string | null = null;
    
    // Try multiple potential CID locations based on Jackal SDK patterns
    const response = findFileInfo.response;
    const decoded = findFileInfo.decoded;
    
    // Strategy 1: Try potential hex strings from protobuf parsing
    if (decoded.potentialHexStrings && decoded.potentialHexStrings.length > 0) {
      for (const hexStr of decoded.potentialHexStrings) {
        if (hexStr.value.length === 64) { // 32 bytes as hex = 64 chars
          cid = hexStr.value;
          console.log('🎯 Using CID from potential hex string:', cid);
          break;
        }
      }
    }
    
    // Strategy 2: Try possible hashes from raw byte analysis
    if (!cid && decoded.possibleHashes && decoded.possibleHashes.length > 0) {
      cid = decoded.possibleHashes[0].hash;
      console.log('🎯 Using CID from possible hash at offset', decoded.possibleHashes[0].offset, ':', cid);
    }
    
    // Strategy 3: Try hex candidates from deep object traversal
    if (!cid && findFileInfo.candidates && findFileInfo.candidates.length > 0) {
      const firstCandidate = findFileInfo.candidates[0];
      if (firstCandidate) {
        const match = firstCandidate.match(/([0-9a-f]{64})/i);
        if (match) {
          cid = match[1];
          console.log('🎯 Using CID from hex candidates:', cid);
        }
      }
    }
    
    // Fallback: try the old method as backup
    if (!cid) {
      console.log('⚠️  No CID found in FindFile response, falling back to SHA256(fileId)');
      cid = createHash('sha256').update(fileId).digest('hex');
    }
    
    console.log('ULID', fileId);
    console.log('USING_CID_FOR_DOWNLOAD', cid);
    
    if (!cid) {
      throw new Error('Could not determine CID for file download');
    }
    
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