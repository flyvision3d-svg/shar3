"use client";

import { useState } from "react";

export default function Home() {
  const [imageUrl, setImageUrl] = useState("");
  const [generatedUrl, setGeneratedUrl] = useState("");

  const handleGenerate = async () => {
    if (!imageUrl.trim()) return;
    
    try {
      const response = await fetch('/api/shorten', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ url: imageUrl }),
      });
      
      if (response.ok) {
        const data = await response.json();
        setGeneratedUrl(data.shortUrl);
      } else {
        // Fallback to long URL if shortener fails
        const encodedUrl = encodeURIComponent(imageUrl);
        const shar3Url = `${window.location.origin}/view?u=${encodedUrl}`;
        setGeneratedUrl(shar3Url);
      }
    } catch (error) {
      console.error('Error generating short link:', error);
      // Fallback to long URL
      const encodedUrl = encodeURIComponent(imageUrl);
      const shar3Url = `${window.location.origin}/view?u=${encodedUrl}`;
      setGeneratedUrl(shar3Url);
    }
  };

  const copyToClipboard = async () => {
    try {
      await navigator.clipboard.writeText(generatedUrl);
      alert("Copied to clipboard!");
    } catch (err) {
      console.error("Failed to copy:", err);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-zinc-50 font-sans dark:bg-black">
      <main className="flex min-h-screen w-full max-w-2xl flex-col items-center justify-center py-32 px-8 bg-white dark:bg-black">
        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold tracking-tight text-black dark:text-zinc-50 mb-4">
            Shar3
          </h1>
          <p className="text-lg text-zinc-600 dark:text-zinc-400 mb-2">
            Decentralized Image Preview Wrapper
          </p>
          <p className="text-sm text-zinc-500 dark:text-zinc-500">
            Generate shareable links with previews for images on decentralized storage
          </p>
        </div>

        <div className="w-full max-w-md space-y-6">
          <div>
            <label htmlFor="image-url" className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-2">
              Image URL
            </label>
            <input
              id="image-url"
              type="url"
              value={imageUrl}
              onChange={(e) => setImageUrl(e.target.value)}
              placeholder="https://your-image-url.com/image.jpg"
              className="w-full px-4 py-3 border border-zinc-300 dark:border-zinc-700 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-zinc-800 dark:text-zinc-100"
            />
          </div>

          <button
            onClick={handleGenerate}
            disabled={!imageUrl.trim()}
            className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-zinc-300 disabled:cursor-not-allowed text-white font-semibold py-3 px-6 rounded-lg transition-colors"
          >
            Generate Shar3 Link
          </button>

          {generatedUrl && (
            <div className="space-y-3">
              <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300">
                Your Shar3 Link
              </label>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={generatedUrl}
                  readOnly
                  className="flex-1 px-4 py-3 border border-zinc-300 dark:border-zinc-700 rounded-lg bg-zinc-50 dark:bg-zinc-800 dark:text-zinc-100"
                />
                <button
                  onClick={copyToClipboard}
                  className="px-4 py-3 bg-zinc-600 hover:bg-zinc-700 text-white rounded-lg transition-colors"
                >
                  Copy
                </button>
              </div>
              <p className="text-xs text-zinc-500 dark:text-zinc-500">
                Share this link on X, Telegram, Discord, or any social platform to show image previews
              </p>
            </div>
          )}
        </div>

        <div className="mt-16 text-center">
          <p className="text-xs text-zinc-400 dark:text-zinc-600">
            Powered by decentralized storage • No files hosted • Zero uploads required
          </p>
        </div>
      </main>
    </div>
  );
}
