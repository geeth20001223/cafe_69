import { redirect } from 'next/navigation';
import { getSession } from './lib/auth';

export default async function Home() {
  const session = await getSession();
  if (!session) redirect('/login');
  const routes: Record<string, string> = {
    admin: '/dashboard/admin',
    inventory_manager: '/dashboard/inventory',
    cashier: '/dashboard/cashier',
    finance_manager: '/dashboard/finance',
  };
  redirect(routes[session.role] || '/login');
}
