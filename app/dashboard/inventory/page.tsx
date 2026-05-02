import { getSession } from '@/app/lib/auth';
import { redirect } from 'next/navigation';
import InventoryDashboardClient from './InventoryDashboardClient';

export default async function InventoryDashboard() {
  const session = await getSession();
  if (!session) redirect('/auth.v1');
  if (!['admin', 'inventory_manager'].includes(session.role)) redirect('/auth.v1');
  return <InventoryDashboardClient />;
}
