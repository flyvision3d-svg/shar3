// URL storage using a simple mapping approach
// In production, this would use a database

const urlMappings: Record<string, string> = {
  // We'll store URL mappings here
  // For now, we'll use the approach in the [shortId] route to fall back to long URLs
};

export function storeUrl(shortId: string, url: string): void {
  urlMappings[shortId] = url;
}

export function getUrl(shortId: string): string | null {
  return urlMappings[shortId] || null;
}

// For MVP, let's use a simpler approach - encode the URL in the shortId itself
export function createShortUrl(baseUrl: string, originalUrl: string): string {
  // For now, just use the regular long URL approach as fallback
  const encoded = encodeURIComponent(originalUrl);
  return `${baseUrl}/view?u=${encoded}`;
}