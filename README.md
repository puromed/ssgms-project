## State Grant Management System (SSGMS)

A React + Vite frontend for managing state grants, fund sources, disbursements, and team access. Auth and data are powered by Supabase.

### Features
- Authenticated access with role awareness (admin vs staff)
- Grants: create, filter, export, and visualize disbursements and yearly counts
- Disbursements: track payouts per grant and generate offer letters
- Team management (admin only): invite and manage users
- Protected routing and admin guard for sensitive areas

### Prerequisites
- Node.js 18+ and npm
- A Supabase project with tables: `profiles`, `grant_years`, `fund_sources`, `grants`, `disbursements`
- Supabase anon key and URL

### Setup
1) Install dependencies
```bash
npm install
```

2) Create `.env` in the project root
```bash
VITE_SUPABASE_URL=your-supabase-url
VITE_SUPABASE_ANON_KEY=your-anon-key
```

3) Start the dev server
```bash
npm run dev
```
Visit the printed localhost URL (default `http://localhost:5173`).

### Building and previewing
```bash
npm run build
npm run preview
```

### Testing (type checks)
```bash
npm run typecheck
```

### Project structure (key files)
- `src/App.tsx` – routes and guards
- `src/components/Layout.tsx` – sidebar and layout
- `src/components/ProtectedRoute.tsx` – auth gate
- `src/pages/*` – feature pages (Dashboard, Grants, Disbursements, Team, Login)
- `src/lib/supabase.ts` – Supabase client setup
- `src/lib/types.ts` – generated DB types

### Notes on data
- Status values for grants are lowercase (`approved`, `ongoing`, `completed`) to match DB constraints.
- `grant_years` uses `year_value` for the year field.
- `fund_sources` uses `source_name` for the name field.

### Admin-only areas
- The Team page is hidden for staff and additionally protected server-side via routing guard.

### Troubleshooting
- Blank page on load: ensure `.env` is set and restart `npm run dev` so Vite picks up env vars.
- Supabase errors: check the browser console for RLS/permission messages; adjust Supabase policies accordingly.
