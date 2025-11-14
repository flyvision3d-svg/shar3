// Look for mainnet API endpoints specifically
async function findMainnetEndpoints() {
  console.log('🔍 Looking for mainnet Jackal API endpoints...');
  
  try {
    const jsUrl = 'https://vault.jackalprotocol.com/assets/index-D6u7F7l-.js';
    const response = await fetch(jsUrl);
    const jsCode = await response.text();
    
    // Look for mainnet patterns (without "testnet")
    const mainnetPatterns = [
      // Direct mainnet URLs
      /https?:\/\/(?!testnet)[^"'\s)]+jackalprotocol\.com[^"'\s)]*/gi,
      // API patterns that might be mainnet
      /https?:\/\/(?:api|rpc)\.jackalprotocol\.com[^"'\s)]*/gi,
      // Any jackal domain that's not testnet
      /https?:\/\/(?!testnet)[^"'\s)]*jackalprotocol\.com[^"'\s)]*/gi
    ];
    
    console.log('🌐 Mainnet endpoints found:');
    const allEndpoints = new Set();
    
    mainnetPatterns.forEach((pattern, index) => {
      const matches = jsCode.match(pattern);
      if (matches) {
        console.log(`\n📡 Pattern ${index + 1} results:`);
        matches.forEach(match => {
          if (!match.includes('testnet')) {
            allEndpoints.add(match);
            console.log(`  ${match}`);
          }
        });
      }
    });
    
    console.log('\n🎯 Unique mainnet endpoints:');
    Array.from(allEndpoints).forEach((endpoint, i) => {
      console.log(`  ${i+1}: ${endpoint}`);
    });
    
    // Also look for any patterns that might indicate RPC or API structure
    console.log('\n🔍 Looking for endpoint patterns...');
    const endpointPatterns = jsCode.match(/"[^"]*(?:rpc|api|grpc|rest)[^"]*"/gi);
    if (endpointPatterns) {
      const uniquePatterns = [...new Set(endpointPatterns)];
      uniquePatterns.forEach((pattern, i) => {
        if (!pattern.includes('testnet') && pattern.includes('jackal')) {
          console.log(`  ${i+1}: ${pattern}`);
        }
      });
    }
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  }
}

findMainnetEndpoints();