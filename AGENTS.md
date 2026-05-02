<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

---

# Cafe 69 POS — AGENTS.md

Agent instructions for the **Cafe 69** Point of Sale system. Read this entire file before touching any code.

---

## 📁 Project Overview

| Item | Value |
|---|---|
| **Framework** | Next.js 16 (App Router, Turbopack) |
| **Language** | TypeScript |
| **Database** | SQLite via `better-sqlite3` (`cafe69.db`) |
| **Auth** | `jose` JWT — cookie name `cafe69_token` |
| **Styling** | Vanilla CSS (`app/globals.css`) — **no Tailwind** |
| **Dev server** | `npm run dev` → `http://localhost:3000` |

---

## 🏗️ Directory Structure

```
app/
├── api/                   # All API route handlers
│   ├── alerts/            # GET stock alerts, PUT mark read
│   ├── auth/              # GET /api/auth → session info
│   ├── categories/        # CRUD for product categories
│   ├── login/             # POST login → sets JWT cookie
│   ├── products/          # CRUD for products
│   │   └── [id]/          # GET / PUT / DELETE by ID
│   ├── quotations/        # CRUD for inventory quotations
│   │   └── [id]/          # PUT approve/reject/edit
│   ├── reports/           # Inventory reports
│   ├── sales/             # POST create sale, GET list/filter
│   │   └── [id]/          # GET sale with items
│   └── users/             # Admin: CRUD users
│       └── [id]/          # PUT update, DELETE deactivate
├── components/
│   └── Sidebar.tsx        # Role-based nav — update navByRole here
├── dashboard/
│   ├── admin/             # Admin: stats + full user management
│   │   ├── page.tsx       # Server wrapper (auth guard only)
│   │   ├── AdminDashboardClient.tsx  # All client logic
│   │   └── users/         # Dedicated user management page
│   ├── cashier/           # Cashier POS terminal + history
│   │   ├── page.tsx       # POS with cart, checkout, session close
│   │   └── history/       # Sales history with print
│   ├── finance/           # Finance manager pages
│   │   ├── page.tsx       # Dashboard
│   │   ├── prices/        # Price management (cost + selling)
│   │   ├── quotations/    # Approve/reject quotations
│   │   ├── reports/       # Sales reports
│   │   └── sessions/      # Session close reports
│   └── inventory/         # Inventory manager pages
│       ├── page.tsx        # Dashboard
│       ├── products/       # Full product CRUD
│       ├── categories/     # Category accordion + add products
│       ├── alerts/         # Low-stock alerts
│       ├── reports/        # Inventory reports
│       └── quotations/     # Submit quotations to finance
├── lib/
│   ├── auth.ts            # getSession(), getSessionFromRequest()
│   └── db.ts              # getDb() singleton, initSchema()
├── login/                 # Login page (public)
├── globals.css            # ALL styles — CSS variables + components
└── layout.tsx             # Root layout
```

---

## 🔐 Authentication & Roles

**JWT cookie:** `cafe69_token` (HttpOnly, signed with `JWT_SECRET`)

### Role → Dashboard Route Mapping
| Role | Dashboard | Capabilities |
|---|---|---|
| `admin` | `/dashboard/admin` | Everything — users, products, categories, sales, finance |
| `inventory_manager` | `/dashboard/inventory` | Products, categories, stock alerts, quotations, reports |
| `cashier` | `/dashboard/cashier` | POS terminal, sales history, session close |
| `finance_manager` | `/dashboard/finance` | Price management, quotation approval, reports |

### Auth Helpers
```ts
// Server Components / Route Handlers
import { getSession } from '@/app/lib/auth';          // uses cookies()
import { getSessionFromRequest } from '@/app/lib/auth'; // uses req headers

// Always guard API routes:
const session = await getSessionFromRequest(req);
if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
```

### Default Seeded Credentials
| Email | Password | Role |
|---|---|---|
| `admin@cafe69.lk` | `admin123` | admin |

---

## 🗄️ Database Schema (SQLite)

All queries use `better-sqlite3` (synchronous). Access via `getDb()` singleton.

```
users          — id, name, email, password_hash, role, is_active, created_at
categories     — id, name, description, status, created_at
products       — id, name, category_id, cost_price, selling_price, quantity,
                 unit, low_stock_threshold, status, description, created_at, updated_at
stock_alerts   — id, product_id, alert_type, message, is_read, created_at
sales          — id, cashier_id, session_type (lunch|night), total_amount,
                 discount_amount, payment_method (cash|card), customer_name, notes, status, created_at
sale_items     — id, sale_id, product_id, product_name, quantity, unit_price, cost_price, subtotal
quotations     — id, manager_id, title, status (pending|approved|rejected),
                 items_json, total, notes, approved_by, approved_at, created_at
inventory_reports — id, manager_id, report_date, report_type, title, data_json, created_at
session_reports   — id, session_type, start_time, end_time, total_sales,
                    total_transactions, data_json, sent_to_finance, created_at
```

### ⚠️ Critical SQL Rule
**Always use single quotes for string literals in SQL:**
```ts
// ✅ CORRECT
db.prepare("SELECT * FROM products WHERE status = 'active'").all();
db.prepare(`SELECT * FROM sales WHERE session_type = 'lunch'`).get();

// ❌ WRONG — SQLite treats double-quoted strings as column identifiers
db.prepare('SELECT * FROM products WHERE status = "active"').all();
```

---

## 🎨 Styling System

All styles live in `app/globals.css`. **Never use inline styles for layout that belongs in CSS.** Use the pre-built CSS classes:

### CSS Classes
| Class | Usage |
|---|---|
| `.card` | White/dark card container |
| `.stat-card` | Dashboard stat box |
| `.btn` | Base button |
| `.btn-primary` | Accent colour button |
| `.btn-secondary` | Muted border button |
| `.btn-success` | Green button |
| `.btn-danger` | Red button |
| `.btn-sm` | Small button modifier |
| `.input` | Form input / select |
| `.table-wrap` | Scrollable table wrapper |
| `.badge` | Status pill |
| `.badge-active` | Green badge |
| `.badge-inactive` | Grey badge |
| `.badge-pending` | Yellow badge |
| `.badge-approved` | Green badge |
| `.badge-rejected` | Red badge |
| `.badge-lunch` | Teal badge |
| `.badge-night` | Purple badge |
| `.modal-overlay` | Full-screen modal backdrop |
| `.modal` | Modal box |
| `.fade-in` | Page entrance animation |

### CSS Variables (defined on `:root`)
```css
--bg-primary, --bg-secondary, --bg-card, --bg-hover
--text-primary, --text-secondary, --text-muted
--accent, --success, --danger, --warning, --info
--border, --border-light
```

---

## 🔌 API Conventions

### Response shapes
```ts
// Success
{ success: true }
{ products: [...] }
{ sale: { ...sale, items: [...] } }

// Error
{ error: 'Message here' }  // with appropriate HTTP status
```

### Role-based API access
```ts
// Finance manager can only update prices — check role before allowing fields
if (session.role === 'finance_manager') {
  // Only: cost_price, selling_price
}
// Admin + inventory_manager: full product CRUD
// Cashier: read-only products, POST sales only
```

### Quotation workflow
```
inventory_manager  →  POST /api/quotations          (status: pending)
finance_manager    →  PUT  /api/quotations/[id]      { status: 'approved' | 'rejected' }
```

### Session type logic
```ts
// Determined server-side from created_at time (Sri Lanka local time)
// 07:00–15:59 → 'lunch'
// 16:00–06:59 → 'night'
```

---

## 🖨️ Print System

All print functions use `window.open('', '_blank')` + `win.document.write(...)` + `win.print()`.

**Pages with print support:**
- Cashier POS → Print receipt after checkout
- Cashier History → Print individual bill + Print all filtered sales
- Cashier Session Close → Print session report
- Finance Prices → Print price list
- Finance Quotations → Print quotation document
- Inventory Quotations → Print quotation document

Print HTML is self-contained (inline `<style>` tags), Arial font, A4 margins.

---

## ⚡ Key Patterns

### Server Component (auth guard only)
```tsx
// page.tsx — keep thin, just auth + redirect
import { redirect } from 'next/navigation';
import { getSession } from '@/app/lib/auth';
import MyPageClient from './MyPageClient';

export default async function MyPage() {
  const session = await getSession();
  if (!session) redirect('/login');
  if (session.role !== 'expected_role') redirect('/login');
  return <MyPageClient />;
}
```

### Client Component (all data fetching)
```tsx
'use client';
import { useState, useEffect, useCallback } from 'react';

export default function MyPageClient() {
  const [data, setData] = useState([]);
  const load = useCallback(async () => {
    const res = await fetch('/api/...');
    if (res.ok) { const d = await res.json(); setData(d.items); }
  }, []);
  useEffect(() => { load(); }, [load]);
  // ...
}
```

### Adding a new page
1. Create `app/dashboard/[role]/[page]/page.tsx`
2. Add the nav link to `app/components/Sidebar.tsx` in `navByRole`
3. Add the API route under `app/api/[endpoint]/route.ts`
4. Guard the API with `getSessionFromRequest` + role check

---

## 🚫 Do Not

- Do **not** use Tailwind — this project uses Vanilla CSS only
- Do **not** use `"double quotes"` for SQL string literals
- Do **not** put business logic in `page.tsx` server components — keep them as thin auth guards
- Do **not** call `getDb()` inside Client Components — only in Server Components or API routes
- Do **not** commit `cafe69.db`, `cafe69.db-shm`, `cafe69.db-wal` (already in `.gitignore`)
- Do **not** add `params` as a direct object — always `await params` in Next.js 16 route handlers:
  ```ts
  // ✅ Next.js 16
  export async function GET(req, { params }: { params: Promise<{ id: string }> }) {
    const { id } = await params;
  }
  ```

---

## 🛠️ Common Commands

```powershell
npm run dev        # Start dev server (Turbopack) → localhost:3000
npx tsc --noEmit   # Type-check
```
