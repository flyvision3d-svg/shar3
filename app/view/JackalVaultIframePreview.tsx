'use client';

type JackalVaultIframePreviewProps = {
  vaultUrl: string;
};

export function JackalVaultIframePreview({ vaultUrl }: JackalVaultIframePreviewProps) {
  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <div className="text-sm text-zinc-600 dark:text-zinc-400">
          Jackal Vault preview is displayed via an embedded Vault view.
        </div>
        <a
          href={vaultUrl}
          target="_blank"
          rel="noreferrer"
          className="text-xs px-2 py-1 rounded border border-zinc-300 dark:border-zinc-600 hover:bg-zinc-100 dark:hover:bg-zinc-800 text-zinc-700 dark:text-zinc-300 transition-colors"
        >
          Open in Jackal Vault
        </a>
      </div>

      <div className="border border-zinc-200 dark:border-zinc-700 rounded-lg overflow-hidden bg-white dark:bg-black shadow-sm">
        <iframe
          src={vaultUrl}
          title="Jackal Vault Preview"
          className="w-full border-0"
          style={{ minHeight: 480 }}
          loading="lazy"
          sandbox="allow-scripts allow-same-origin allow-popups allow-forms"
        />
      </div>
      
      <div className="text-xs text-zinc-500 dark:text-zinc-500 flex items-center gap-2">
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
        <span>
          This preview loads the file directly from Jackal Vault. 
          Your files remain encrypted and decentralized.
        </span>
      </div>
    </div>
  );
}