// Analyze the full Jackal HTML to find clues about the API calls
const jackalUrl = 'https://vault.jackalprotocol.com/v/jkl1wuegm9pa02nnaur0xs8klx3ztngr4fd4m0hj06/01K9YXQ9RYC2ZKXY30ZDBFAG5F?k=01K9YXZ5DKZHM5WCDG41X5SS6V';

async function analyzeJackalHtml() {
  console.log('🔍 Analyzing Jackal Vault HTML for API clues...');
  
  try {
    const response = await fetch(jackalUrl);
    const html = await response.text();
    
    console.log('📄 Full HTML content:');
    console.log('='.repeat(80));
    console.log(html);
    console.log('='.repeat(80));
    console.log('');
    
    // Look for JavaScript files or API endpoints
    console.log('🔍 Looking for JavaScript files:');
    const scriptMatches = html.match(/<script[^>]*src=["']([^"']+)["']/gi);
    if (scriptMatches) {
      scriptMatches.forEach((match, i) => {
        const srcMatch = match.match(/src=["']([^"']+)["']/);
        if (srcMatch) {
          console.log(`  ${i+1}: ${srcMatch[1]}`);
        }
      });
    }
    console.log('');
    
    // Look for any hardcoded URLs or API references
    console.log('🔍 Looking for URL patterns:');
    const urlMatches = html.match(/https?:\/\/[^"'\s)}>]+/gi);
    if (urlMatches) {
      const uniqueUrls = [...new Set(urlMatches)];
      uniqueUrls.forEach((url, i) => {
        console.log(`  ${i+1}: ${url}`);
      });
    }
    console.log('');
    
    // Extract the file ID and key from the URL for analysis
    const urlParts = jackalUrl.match(/\/v\/([^\/]+)\/([^?]+)\?k=(.+)/);
    if (urlParts) {
      console.log('📊 URL Components:');
      console.log(`  Vault Address: ${urlParts[1]}`);
      console.log(`  File ID: ${urlParts[2]}`);
      console.log(`  Key: ${urlParts[3]}`);
    }
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  }
}

analyzeJackalHtml();