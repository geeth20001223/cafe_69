import { redirect } from 'next/navigation';
import { getSession } from './lib/auth';

export default async function Home() {
  const session = await getSession();
  if (!session) redirect('/auth.v1');
  const routes: Record<string, string> = {
    admin: '/sys.admin',
    inventory_manager: '/sys.inventory',
    cashier: '/sys.terminal',
    finance_manager: '/sys.finance',
  };
  redirect(routes[session.role] || '/auth.v1');
}
