import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'Cafe 69 — POS System',
  description: 'Point of Sale system for Cafe 69',
};

import TableScrollSync from './components/TableScrollSync';

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <TableScrollSync />
        {children}
      </body>
    </html>
  );
}