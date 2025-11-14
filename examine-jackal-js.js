// Examine the Jackal JavaScript file to find API endpoints
async function examineJackalJs() {
  console.log('🔍 Fetching Jackal Vault JavaScript...');
  
  try {
    const jsUrl = 'https://vault.jackalprotocol.com/assets/index-D6u7F7l-.js';
    const response = await fetch(jsUrl);
    const jsCode = await response.text();
    
    console.log(`📄 JavaScript file size: ${jsCode.length} characters`);
    console.log('');
    
    // Look for API endpoints, URLs, and fetch calls
    console.log('🔍 Looking for API patterns...');
    
    // Pattern 1: URLs that might be API endpoints
    const urlMatches = jsCode.match(/https?:\/\/[^"'\s)}>]+/gi);
    if (urlMatches) {
      const uniqueUrls = [...new Set(urlMatches)];
      console.log('URLs found:');
      uniqueUrls.forEach((url, i) => {
        console.log(`  ${i+1}: ${url}`);
      });
      console.log('');
    }
    
    // Pattern 2: Look for fetch or API calls
    const fetchMatches = jsCode.match(/fetch\([^)]+\)/gi);
    if (fetchMatches) {
      console.log('Fetch calls found:');
      fetchMatches.slice(0, 10).forEach((call, i) => {
        console.log(`  ${i+1}: ${call}`);
      });
      if (fetchMatches.length > 10) {
        console.log(`  ... and ${fetchMatches.length - 10} more`);
      }
      console.log('');
    }
    
    // Pattern 3: Look for anything that might be file-related endpoints
    const fileMatches = jsCode.match(/['"\/][^'"]*(?:file|download|image|data|blob)[^'"]*['"]/gi);
    if (fileMatches) {
      const uniqueFiles = [...new Set(fileMatches)];
      console.log('File/download related patterns:');
      uniqueFiles.slice(0, 20).forEach((pattern, i) => {
        console.log(`  ${i+1}: ${pattern}`);
      });
      if (uniqueFiles.length > 20) {
        console.log(`  ... and ${uniqueFiles.length - 20} more`);
      }
      console.log('');
    }
    
    // Pattern 4: Look for base URLs or domain references
    const domainMatches = jsCode.match(/['"]((?:https?:\/\/)?[a-zA-Z0-9.-]+\.(?:com|org|net|io|app)(?:\/[^'"]*)?)['"]/gi);
    if (domainMatches) {
      const uniqueDomains = [...new Set(domainMatches)];
      console.log('Domain references found:');
      uniqueDomains.forEach((domain, i) => {
        console.log(`  ${i+1}: ${domain}`);
      });
    }
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  }
}

examineJackalJs();