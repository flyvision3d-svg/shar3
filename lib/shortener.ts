// Simple in-memory storage for MVP
// In production, this would use a database
const urlStore = new Map<string, string>();

// Generate a short ID (6 characters)
function generateShortId(): string {
  const chars = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let result = '';
  for (let i = 0; i < 6; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
}

export function createShortLink(originalUrl: string): string {
  // Check if we already have this URL
  for (const [shortId, url] of urlStore) {
    if (url === originalUrl) {
      return shortId;
    }
  }
  
  // Generate new short ID
  let shortId = generateShortId();
  
  // Ensure uniqueness (very unlikely collision with 6 chars, but good practice)
  while (urlStore.has(shortId)) {
    shortId = generateShortId();
  }
  
  urlStore.set(shortId, originalUrl);
  return shortId;
}

export function resolveShortLink(shortId: string): string | null {
  return urlStore.get(shortId) || null;
}