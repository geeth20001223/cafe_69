import { getSession } from '@/app/lib/auth';
import { redirect } from 'next/navigation';
import InventoryDashboardClient from './InventoryDashboardClient';

export default async function InventoryDashboard() {
  const session = await getSession();
  if (!session) redirect('/login');
  if (!['admin', 'inventory_manager'].includes(session.role)) redirect('/login');
  return <InventoryDashboardClient />;
}
