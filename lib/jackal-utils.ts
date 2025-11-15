/**
 * Jackal Vault URL utilities
 */

export interface VaultUrlParts {
  address: string;
  ulid: string;
  linkKey: string;
}

/**
 * Check if a URL is a Jackal Vault URL
 */
export function isJackalVaultUrl(url: string): boolean {
  try {
    const u = new URL(url);
    return u.hostname === 'vault.jackalprotocol.com' && u.pathname.startsWith('/v/');
  } catch {
    return false;
  }
}

/**
 * Parse Jackal Vault URL into components
 * Example: https://vault.jackalprotocol.com/v/jkl1.../ULID?k=KEY
 */
export function parseVaultUrl(vaultUrl: string): VaultUrlParts {
  try {
    const u = new URL(vaultUrl);
    
    // path: /v/<address>/<ulid>
    const parts = u.pathname.split('/').filter(Boolean); // ['v', '<address>', '<ulid>']
    const address = parts[1];
    const ulid = parts[2];
    const linkKey = u.searchParams.get('k');
    
    if (!address || !ulid || !linkKey) {
      throw new Error('Invalid Vault URL: missing address, ulid, or k=');
    }
    
    return { address, ulid, linkKey };
  } catch (error) {
    throw new Error(`Failed to parse vault URL: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}