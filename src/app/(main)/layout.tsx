import { redirect } from 'next/navigation';
import { verifyToken } from '@/lib/auth';

export default async function MainLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const session = await verifyToken();
  if (!session) {
    redirect('/login');
  }

  return children;
}
