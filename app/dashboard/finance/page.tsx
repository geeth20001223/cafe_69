import { getSession } from '@/app/lib/auth';
import { redirect } from 'next/navigation';
import FinanceDashboardClient from './FinanceDashboardClient';

export default async function FinanceDashboard() {
  const session = await getSession();
  if (!session) redirect('/login');
  if (!['admin', 'finance_manager'].includes(session.role)) redirect('/login');
  return <FinanceDashboardClient />;
}
