import { resolveShortLink } from '@/lib/shortener';
import { redirect } from 'next/navigation';

interface ShortLinkPageProps {
  params: Promise<{ shortId: string }>;
}

export default async function ShortLinkPage({ params }: ShortLinkPageProps) {
  const { shortId } = await params;
  
  const originalUrl = resolveShortLink(shortId);
  
  if (!originalUrl) {
    redirect('/');
  }

  // Redirect to the view page with the original URL
  const encodedUrl = encodeURIComponent(originalUrl);
  redirect(`/view?u=${encodedUrl}`);
}