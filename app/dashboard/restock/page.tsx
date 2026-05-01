import { redirect } from 'next/navigation';
import { getSession } from '@/app/lib/auth';
import RestockDashboardClient from './RestockDashboardClient';

export default async function RestockDashboard() {
  const session = await getSession();
  if (!session) redirect('/login');
  if (!['admin', 'inventory_manager', 'finance_manager'].includes(session.role)) {
    redirect('/login');
  }
  return <RestockDashboardClient />;
}
