import { getSession } from '@/app/lib/auth';
import { redirect } from 'next/navigation';
import FinanceDashboardClient from './FinanceDashboardClient';

export default async function FinanceDashboard() {
  const session = await getSession();
  if (!session) redirect('/auth.v1');
  if (!['admin', 'finance_manager'].includes(session.role)) redirect('/auth.v1');
  return <FinanceDashboardClient urlKey={session.urlKey as string} />;
}
