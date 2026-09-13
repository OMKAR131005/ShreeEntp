# Field Ledger

Customer & lead tracking for device pickups — field-executive workflow, admin
dashboard, CSV export. Backed by Supabase (Postgres + Storage).

## 1. Set up the database (5 min, one time)

1. Open your Supabase project → **SQL Editor** → **New query**.
2. Paste the entire contents of `supabase/schema.sql` and run it.
   This creates the tables, the login functions, row-level security, and a
   private storage bucket for ID-proof uploads. It also seeds the same demo
   accounts the prototype used:
   - Field executives: `sangewar` / `dnyaneshwar` / `harish` / `ajit`, each
     with password `<username>123`
   - Admin: `admin` / `admin123`

   **Change these passwords (or delete and recreate the accounts) before you
   hand this to real users** — see the "Change a password" section below.

## 2. Run it locally

```bash
npm install
npm run dev
```

The `.env` file already has your project's URL and anon key filled in. If
you ever need to point this at a different Supabase project, edit `.env`
(see `.env.example` for the shape) and restart `npm run dev`.

## 3. Deploy to Vercel

1. Push this folder to a GitHub repo.
2. In Vercel: **Add New → Project**, import the repo. Vercel auto-detects
   Vite — no build settings to change.
3. Before the first deploy, add two environment variables in
   **Project Settings → Environment Variables**:
   - `VITE_SUPABASE_URL` = `https://dlkocbfiuxzlsnhpuyxe.supabase.co`
   - `VITE_SUPABASE_ANON_KEY` = `sb_publishable_DAzFA6FDTGkNIXekL5_NMQ_SDmDbfTq`
4. Deploy. That's it — you'll get a `*.vercel.app` URL immediately, and can
   attach a custom domain afterward under **Project Settings → Domains**.

## Change a password

Passwords are hashed in the database and never sent to or readable by the
browser, so there's no "reset" screen yet — do it from the SQL editor:

```sql
select set_fe_password('sangewar', 'a-new-password');
```

For the admin account, run the equivalent update directly:

```sql
update admin_users set password_hash = crypt('a-new-admin-password', gen_salt('bf'))
where username = 'admin';
```

Or, as an admin inside the app itself: **Field executives tab → Edit** on
any row lets you set a new password without touching SQL.

## Data model

| Table | Purpose |
|---|---|
| `customers` | One row per customer, keyed by `CUST-00001` style IDs (generated via a Postgres sequence, `next_customer_seq()`) |
| `leads` | One row per visit/lead, references `customers.id` |
| `field_executives` | Login + display name for field staff. Only `username`, `name`, `active` are ever readable from the browser — `password_hash` is locked down at the column level |
| `admin_users` | Admin login. No browser access at all; only the `verify_admin_login` function (which runs with elevated privileges) can read it |

ID-proof photos are uploaded to a private Storage bucket called
`id-proofs`, one subfolder per customer ID. The app stores the file path on
the customer row, not the image itself.

## ⚠️ Security note — read before going live with real customer data

This app doesn't use Supabase Auth sessions; it does its own login check
against `field_executives` / `admin_users` via database functions, then
just remembers the result in React state. That means:

- **Login passwords are safe** — they're hashed in Postgres and verified
  server-side; the browser never sees a hash.
- **Everything else is open.** The `customers` and `leads` tables allow
  read/write to anyone holding the app's public anon key — which is anyone
  who loads the deployed site, since that key ships in the JavaScript
  bundle by design. There's currently no way to stop a technically-inclined
  visitor from reading or editing lead/customer data directly against the
  Supabase API, bypassing the app's UI and its login screen entirely.

For a prototype or an internal tool on a private URL, this is a reasonable
trade-off for shipping fast. Before this holds real customer PII (names,
addresses, ID document images) at any scale, the next step is to move to
proper Supabase Auth (so RLS policies can check `auth.uid()` / a real user
role instead of `using (true)`) — happy to help with that migration when
you're ready.
