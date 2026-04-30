import { redirect } from 'next/navigation';
import { getSession } from '@/app/lib/auth';
import AdminDashboardClient from './AdminDashboardClient';

export default async function AdminDashboard() {
  const session = await getSession();
  if (!session) redirect('/login');
  if (session.role !== 'admin') redirect('/dashboard/' + session.role.replace('_manager', '').replace('_', ''));

  return <AdminDashboardClient />;
}
