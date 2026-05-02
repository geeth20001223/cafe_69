import { redirect } from 'next/navigation';
import { getSession } from '@/app/lib/auth';
import RestockDashboardClient from './RestockDashboardClient';

export default async function RestockDashboard() {
  const session = await getSession();
  if (!session) redirect('/auth.v1');
  if (!['admin', 'inventory_manager'].includes(session.role)) {
    redirect('/auth.v1');
  }
  return <RestockDashboardClient />;
}
