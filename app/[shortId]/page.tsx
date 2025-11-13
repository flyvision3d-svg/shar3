import { redirect } from 'next/navigation';

interface ShortLinkPageProps {
  params: Promise<{ shortId: string }>;
}

export default async function ShortLinkPage({ params }: ShortLinkPageProps) {
  const { shortId } = await params;
  
  // For MVP, since we can't persist storage between deployments,
  // let's redirect back to home with an error message
  // In production, this would lookup the shortId in a database
  
  // For now, just redirect to homepage
  // TODO: Implement proper database storage for short links
  redirect('/?error=short-link-expired');
}