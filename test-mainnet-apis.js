// Test mainnet Jackal API endpoints
async function testMainnetApis() {
  const endpoints = [
    'https://rpc.jackalprotocol.com',
    'https://api.jackalprotocol.com',
    'https://rest.jackalprotocol.com', // Alternative name
    'https://lcd.jackalprotocol.com',  // LCD/REST API alternative
  ];
  
  console.log('🔍 Testing mainnet Jackal API endpoints...\n');
  
  for (const endpoint of endpoints) {
    try {
      console.log(`📡 Testing: ${endpoint}`);
      const response = await fetch(endpoint, { 
        method: 'HEAD',
        signal: AbortSignal.timeout(5000) 
      });
      console.log(`  ✅ Status: ${response.status}`);
      console.log(`  📄 Content-Type: ${response.headers.get('content-type') || 'none'}`);
    } catch (error) {
      console.log(`  ❌ Failed: ${error.message}`);
    }
    console.log('');
  }
  
  // Test some common API paths that might exist
  const apiPaths = [
    '/cosmos/base/tendermint/v1beta1/node_info',
    '/jackal/storage/files', 
    '/jackal/storage/providers',
    '/status'
  ];
  
  console.log('🔍 Testing common API paths on rpc.jackalprotocol.com...\n');
  
  for (const path of apiPaths) {
    try {
      const url = `https://rpc.jackalprotocol.com${path}`;
      console.log(`📡 Testing: ${url}`);
      const response = await fetch(url, { 
        signal: AbortSignal.timeout(5000) 
      });
      console.log(`  ✅ Status: ${response.status}`);
      if (response.ok) {
        const text = await response.text();
        console.log(`  📄 Response length: ${text.length} chars`);
        console.log(`  🔍 Preview: ${text.substring(0, 100)}...`);
      }
    } catch (error) {
      console.log(`  ❌ Failed: ${error.message}`);
    }
    console.log('');
  }
}

testMainnetApis();