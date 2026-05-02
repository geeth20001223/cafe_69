# 🚀 Cafe 69 POS — Production Deployment Guide

Follow these steps to move your system from **localhost** to the **Internet**.

## 1. Environment Variables (Critical)
You must set these variables in your hosting provider (e.g., Vercel, Netlify, or Railway).

| Variable | Example Value | Description |
|---|---|---|
| `JWT_SECRET` | `your-random-secret-string` | Used to sign session tokens. Keep this private! |
| `TURSO_DATABASE_URL` | `libsql://cafe69-user.turso.io` | Your remote Turso database URL. |
| `TURSO_AUTH_TOKEN` | `eyJhbGciOiJIUzI1...` | Your Turso database access token. |
| `NEXT_PUBLIC_BASE_URL` | `https://your-pos-name.vercel.app` | The public URL of your application. |
| `GMAIL_USER` | `your-email@gmail.com` | Email for sending reports and alerts. |
| `GMAIL_APP_PASSWORD` | `xxxx xxxx xxxx xxxx` | Google App Password (NOT your regular password). |
| `FINANCE_MANAGER_EMAIL`| `manager@cafe69.lk` | Default recipient for financial reports. |

## 2. Secure Cookie Configuration
The system is now configured to automatically use `secure: true` when running on HTTPS. Ensure your production site is served via **SSL/TLS (HTTPS)**.

## 3. Database Migration
1. Create a new Turso database.
2. Initialize the schema using the `app/lib/db.ts` logic (it runs automatically on the first connection if the tables are missing).
3. Seed the admin user manually or via an initial login attempt if you have a seeder script.

## 4. URL Obfuscation & Security
The system uses `middleware.ts` to mask internal routes.
- **Internal Route**: `/dashboard/admin`
- **Masked Route**: `/s/[random_key]/sys.admin`
- **Redirects**: If a user tries to access `/dashboard` directly, they will be redirected to their role's masked URL.

## 5. Timezone Verification
The system is hard-coded to **Sri Lanka Time (UTC+5:30)**. 
- Date strings in the database are stored using `datetime('now', '+5 hours', '30 minutes')`.
- This ensures that your "Today's Sales" always match the local business day, even if your server is located in the US or Europe.

## 6. System Health Checklist
- [ ] Authentication works (Login/Logout).
- [ ] Sales created in the POS appear instantly in the Finance Dashboard.
- [ ] Email reports are successfully sent to the Finance Manager.
- [ ] URL Obfuscation works (URLs contain a random `/s/...` key).
- [ ] The top scrollbar is visible on large tables in the Admin/Finance dashboards.

---
**Debug Tip**: If transactions are missing, check the server logs for `[POST - Session]` and `[GET - Sales]` diagnostic messages.
