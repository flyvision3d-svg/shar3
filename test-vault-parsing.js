// Test our Jackal Vault URL parsing
import { parseVaultUrl } from './lib/jackalVault.js';

const testUrl = 'https://vault.jackalprotocol.com/v/jkl1wuegm9pa02nnaur0xs8klx3ztngr4fd4m0hj06/01K9YXQ9RYC2ZKXY30ZDBFAG5F?k=01K9YXZ5DKZHM5WCDG41X5SS6V';

try {
  console.log('🔍 Testing Vault URL parsing...');
  console.log('Input URL:', testUrl);
  console.log('');
  
  const parsed = parseVaultUrl(testUrl);
  
  console.log('✅ Parsing successful:');
  console.log('  Vault Address:', parsed.vaultAddress);
  console.log('  File ID:', parsed.fileId);
  console.log('  Key:', parsed.key.substring(0, 10) + '...');
  
} catch (error) {
  console.error('❌ Parsing failed:', error.message);
}