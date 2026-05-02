import { redirect } from 'next/navigation';
import { getSession } from '@/app/lib/auth';
import DashboardLayoutClient from './DashboardLayoutClient';

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const session = await getSession();
  if (!session) redirect('/auth.v1');

  return (
    <DashboardLayoutClient session={session as any}>
      {children}
    </DashboardLayoutClient>
  );
}
