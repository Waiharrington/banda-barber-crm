# AstroBarber Auth + RLS Migration

## 1. Prepare staff emails

Every active `staff` row must have a real email before login can move to Supabase Auth.

Use Supabase SQL Editor to inspect active staff:

```sql
select id, name, email, auth_user_id, role
from public.staff
where coalesce(role, '') not like 'ARCHIVED|%'
order by name;
```

## 2. Add columns and RLS policies

Run:

```sql
scratch/20260610_auth_rls_migration.sql
```

This adds `staff.email`, `staff.auth_user_id`, helper role functions, RLS policies, and column privileges that avoid exposing `staff.password`.

## 3. Create Auth users and link staff

Copy the example:

```powershell
Copy-Item scratch/auth_users.example.json scratch/auth_users.json
```

Fill `scratch/auth_users.json` with real staff IDs and real emails.

To keep the current staff password during migration, use:

```json
{
  "staff_id": "STAFF_UUID",
  "email": "empleado@correo.com",
  "use_legacy_password": true
}
```

To set a new temporary password instead, use:

```json
{
  "staff_id": "STAFF_UUID",
  "email": "empleado@correo.com",
  "password": "CHANGE_ME_STRONG_PASSWORD"
}
```

`use_legacy_password` reads `staff.password` only from the local admin script using the service role key. The frontend still never queries `staff.password`.

Set the service role key only in your local shell or private `.env` file:

```powershell
$env:SUPABASE_SERVICE_ROLE_KEY="YOUR_SERVICE_ROLE_KEY"
node scratch/migrate_auth_users.cjs
```

Do not commit `SUPABASE_SERVICE_ROLE_KEY` or `scratch/auth_users.json`.

## 4. Verify

- Admin can sign in with email/password.
- Non-admin users can sign in only if their `staff.auth_user_id` is linked.
- `staff.password` is not selected by the frontend.
- Anonymous users cannot query protected tables.
