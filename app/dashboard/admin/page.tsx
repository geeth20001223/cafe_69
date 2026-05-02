import { redirect } from 'next/navigation';
import { getSession } from '@/app/lib/auth';
import AdminDashboardClient from './AdminDashboardClient';

export default async function AdminDashboard() {
  const session = await getSession();

  if (!session) redirect('/auth.v1');
  if (session.role !== 'admin') {
    const sysMap: Record<string, string> = {
      inventory_manager: 'inventory',
      cashier: 'terminal',
      finance_manager: 'finance'
    };
    redirect('/sys.' + (sysMap[session.role] || 'admin'));
  }

  return <AdminDashboardClient urlKey={session.urlKey as string} />;
}