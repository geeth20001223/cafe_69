import { redirect } from 'next/navigation';
import { getSession } from './lib/auth';

export default async function Home() {
  const session = await getSession();
  if (!session) redirect('/auth.v1');
  const routes: Record<string, string> = {
    admin: 'admin',
    inventory_manager: 'inventory',
    cashier: 'terminal',
    finance_manager: 'finance',
  };
  redirect(`/s/${session.urlKey}/sys.${routes[session.role] || 'admin'}`);
}
