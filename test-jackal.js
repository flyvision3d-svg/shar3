// Test script to debug Jackal Vault URL
const jackalUrl = 'https://vault.jackalprotocol.com/v/jkl1wuegm9pa02nnaur0xs8klx3ztngr4fd4m0hj06/01K9YXQ9RYC2ZKXY30ZDBFAG5F?k=01K9YXZ5DKZHM5WCDG41X5SS6V';

async function testJackalUrl() {
  console.log('🔍 Testing Jackal URL:', jackalUrl);
  console.log('');

  try {
    // Test 1: Basic fetch
    console.log('📡 Test 1: Basic fetch...');
    const response = await fetch(jackalUrl);
    console.log('Status:', response.status);
    console.log('Content-Type:', response.headers.get('content-type'));
    console.log('Content-Length:', response.headers.get('content-length'));
    console.log('');

    // Test 2: Get the HTML content
    console.log('📄 Test 2: HTML content...');
    const html = await response.text();
    console.log('HTML length:', html.length);
    console.log('First 500 characters:');
    console.log(html.substring(0, 500));
    console.log('');

    // Test 3: Look for image patterns
    console.log('🖼️  Test 3: Search for image patterns...');
    
    // Pattern 1: img tags
    const imgMatches = html.match(/<img[^>]+src=["']([^"']+)["']/gi);
    console.log('IMG tags found:', imgMatches?.length || 0);
    if (imgMatches) {
      imgMatches.forEach((match, i) => {
        console.log(`  ${i+1}:`, match.substring(0, 100));
      });
    }
    console.log('');

    // Pattern 2: meta og:image
    const ogMatches = html.match(/<meta[^>]+property=["']og:image["'][^>]+content=["']([^"']+)["']/gi);
    console.log('OG:image tags found:', ogMatches?.length || 0);
    if (ogMatches) {
      ogMatches.forEach((match, i) => {
        console.log(`  ${i+1}:`, match);
      });
    }
    console.log('');

    // Pattern 3: Look for any URLs ending in image extensions
    const imageUrlMatches = html.match(/https?:\/\/[^"'\s]+\.(jpg|jpeg|png|gif|webp|svg)/gi);
    console.log('Image URLs found:', imageUrlMatches?.length || 0);
    if (imageUrlMatches) {
      imageUrlMatches.forEach((url, i) => {
        console.log(`  ${i+1}:`, url);
      });
    }
    console.log('');

    // Pattern 4: Look for any data: URLs (base64 images)
    const dataUrlMatches = html.match(/data:image\/[^"'\s;]+;base64,[^"'\s]+/gi);
    console.log('Data URLs found:', dataUrlMatches?.length || 0);
    if (dataUrlMatches) {
      dataUrlMatches.forEach((url, i) => {
        console.log(`  ${i+1}:`, url.substring(0, 100) + '...');
      });
    }

  } catch (error) {
    console.error('❌ Error:', error.message);
  }
}

testJackalUrl();