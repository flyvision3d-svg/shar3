import { Metadata } from "next";
import { redirect } from "next/navigation";

interface ViewPageProps {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}

export async function generateMetadata({ searchParams }: ViewPageProps): Promise<Metadata> {
  const params = await searchParams;
  const imageUrl = params.u as string;

  if (!imageUrl) {
    return {
      title: "Shar3 - Image not found",
      description: "No image URL provided",
    };
  }

  const decodedUrl = decodeURIComponent(imageUrl);
  
  return {
    title: "Shar3 - Decentralized Image Share",
    description: "Image shared via Shar3 decentralized preview wrapper",
    openGraph: {
      title: "Shared via Shar3",
      description: "Decentralized image sharing with instant previews",
      images: [
        {
          url: decodedUrl,
          width: 1200,
          height: 630,
          alt: "Shared image",
        },
      ],
      type: "website",
    },
    twitter: {
      card: "summary_large_image",
      title: "Shared via Shar3",
      description: "Decentralized image sharing with instant previews",
      images: [decodedUrl],
    },
  };
}

export default async function ViewPage({ searchParams }: ViewPageProps) {
  const params = await searchParams;
  const imageUrl = params.u as string;

  if (!imageUrl) {
    redirect("/");
  }

  const decodedUrl = decodeURIComponent(imageUrl);

  return (
    <div className="flex min-h-screen items-center justify-center bg-zinc-50 dark:bg-black p-4">
      <div className="max-w-4xl w-full">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-black dark:text-white mb-2">
            Shar3 Preview
          </h1>
          <p className="text-zinc-600 dark:text-zinc-400">
            Decentralized image sharing
          </p>
        </div>
        
        <div className="bg-white dark:bg-zinc-900 rounded-lg shadow-lg p-6">
          <div className="aspect-auto max-w-full mx-auto">
            {decodedUrl.includes('vault.jackalprotocol.com') ? (
              // Special handling for Jackal Vault URLs
              <div className="text-center py-8">
                <div className="mb-6">
                  <h3 className="text-lg font-semibold text-zinc-900 dark:text-zinc-100 mb-2">
                    Jackal Vault Image
                  </h3>
                  <p className="text-zinc-600 dark:text-zinc-400 mb-4">
                    This image is hosted on Jackal Protocol's decentralized storage.
                  </p>
                </div>
                <iframe
                  src={decodedUrl}
                  className="w-full h-96 border border-zinc-300 dark:border-zinc-700 rounded-lg"
                  title="Jackal Vault Image"
                />
                <p className="text-xs text-zinc-500 mt-4">
                  Click "View on Jackal Vault" below to see the full image interface.
                </p>
              </div>
            ) : (
              // Regular image display
              <img
                src={decodedUrl}
                alt="Shared image"
                className="max-w-full h-auto rounded-lg mx-auto block"
                style={{ maxHeight: "70vh" }}
              />
            )}
          </div>
          
          <div className="mt-6 space-y-4">
            <div>
              <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1">
                Original URL:
              </label>
              <a
                href={decodedUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-200 break-all text-sm"
              >
                {decodedUrl}
              </a>
            </div>
            
            <div className="flex gap-4 justify-center pt-4">
              <a
                href="/"
                className="px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors"
              >
                Create New Shar3 Link
              </a>
              <a
                href={decodedUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="px-6 py-2 border border-zinc-300 dark:border-zinc-700 hover:bg-zinc-50 dark:hover:bg-zinc-800 text-zinc-700 dark:text-zinc-300 rounded-lg transition-colors"
              >
                {decodedUrl.includes('vault.jackalprotocol.com') ? 'View on Jackal Vault' : 'View Original'}
              </a>
            </div>
          </div>
        </div>
        
        <div className="text-center mt-8">
          <p className="text-xs text-zinc-500 dark:text-zinc-500">
            Powered by Shar3 • Decentralized image previews for social media
          </p>
        </div>
      </div>
    </div>
  );
}