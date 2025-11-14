// Jackal Vault decryption helper module
// Based on the mount-file.js logic from Jackal Protocol

import { ClientHandler, IClientSetup } from '@jackallabs/jackal.js';

interface VaultUrlParts {
  vaultAddress: string;
  fileId: string;
  key: string;
}

interface DecryptedFile {
  mimeType: string;
  data: Uint8Array;
}

// Jackal mainnet configuration (based on mount-file.js and IClientSetup interface)
const mainnetConfig: IClientSetup = {
  selectedWallet: 'mnemonic',
  mnemonic: '', // Empty mnemonic for read-only access
  endpoint: 'https://rpc.jackalprotocol.com',
  chainId: 'jackal-1',
  chainConfig: {
    chainId: 'jackal-1',
    chainName: 'Jackal',
    rpc: 'https://rpc.jackalprotocol.com',
    rest: 'https://api.jackalprotocol.com',
    bip44: {
      coinType: 118,
    },
    bech32Config: {
      bech32PrefixAccAddr: 'jkl',
      bech32PrefixAccPub: 'jklpub',
      bech32PrefixValAddr: 'jklvaloper',
      bech32PrefixValPub: 'jklvaloperpub',
      bech32PrefixConsAddr: 'jklvalcons',
      bech32PrefixConsPub: 'jklvalconspub',
    },
    currencies: [
      {
        coinDenom: 'JKL',
        coinMinimalDenom: 'ujkl',
        coinDecimals: 6,
      },
    ],
    feeCurrencies: [
      {
        coinDenom: 'JKL',
        coinMinimalDenom: 'ujkl',
        coinDecimals: 6,
        gasPriceStep: {
          low: 0.002,
          average: 0.002,
          high: 0.02,
        },
      },
    ],
    stakeCurrency: {
      coinDenom: 'JKL',
      coinMinimalDenom: 'ujkl',
      coinDecimals: 6,
    },
    features: [], // Empty features array
  }
};

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
 * Main function to fetch and decrypt a Jackal Vault file using Jackal SDK
 * 
 * @param vaultUrl - Full Jackal Vault share URL
 * @returns Promise resolving to decrypted file data and MIME type
 */
export async function fetchAndDecryptVaultFile(vaultUrl: string): Promise<DecryptedFile> {
  let client: any = null;
  let storage: any = null;

  try {
    console.log('📥 Parsing vault URL...');
    const { vaultAddress, fileId, key } = parseVaultUrl(vaultUrl);
    
    console.log('🔗 Connecting to Jackal Protocol...');
    // Initialize Jackal client (read-only, no mnemonic needed for downloads)
    client = await ClientHandler.connect(mainnetConfig);
    storage = await client.createStorageHandler();
    await storage.upgradeSigner();
    
    console.log('📊 Fetching file metadata...');
    const downloadRequest = {
      ulid: fileId,
      userAddress: vaultAddress,
      linkKey: key
    };
    
    // Get metadata first (replicating mount-file.js logic)
    const metadata = await storage.getMetaDataByUlid(downloadRequest);
    
    if (metadata.metaDataType !== 'file') {
      throw new Error(`Expected file, got ${metadata.metaDataType}`);
    }
    
    console.log('📦 Downloading and decrypting file...');
    const downloadOptions = {
      ulid: fileId,
      linkKey: key,
      trackers: {
        chunks: [],
        progress: 0
      },
      userAddress: vaultAddress
    };
    
    // Download the file (this handles fetching chunks and decryption automatically)
    const file: Blob = await storage.downloadByUlid(downloadOptions);
    
    console.log('✅ File downloaded and decrypted successfully');
    
    // Convert Blob to Uint8Array
    const arrayBuffer = await file.arrayBuffer();
    const data = new Uint8Array(arrayBuffer);
    
    // Determine MIME type
    const mimeType = getMimeType(metadata, metadata.fileMeta?.name);
    
    return {
      mimeType,
      data
    };
    
  } catch (error) {
    console.error('❌ Failed to fetch and decrypt vault file:', error);
    throw error;
  } finally {
    // Clean up client connection if needed
    if (client) {
      try {
        // client.disconnect(); // if such method exists
      } catch (e) {
        console.warn('Warning: Failed to disconnect client:', e);
      }
    }
  }
}

// Export utility functions for testing
export { parseVaultUrl as _parseVaultUrl };