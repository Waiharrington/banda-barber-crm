-- AstroBarber security migration: Supabase Auth + gradual RLS
-- Run this in Supabase SQL Editor after staff.email/auth users are prepared.

BEGIN;

ALTER TABLE public.staff
  ADD COLUMN IF NOT EXISTS email TEXT,
  ADD COLUMN IF NOT EXISTS auth_user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL;

CREATE UNIQUE INDEX IF NOT EXISTS staff_email_unique_idx
  ON public.staff (lower(email))
  WHERE email IS NOT NULL AND email <> '';

CREATE UNIQUE INDEX IF NOT EXISTS staff_auth_user_id_unique_idx
  ON public.staff (auth_user_id)
  WHERE auth_user_id IS NOT NULL;

COMMENT ON COLUMN public.staff.password IS
  'Deprecated legacy password. Do not query from frontend. Remove after Auth migration is complete.';

CREATE OR REPLACE FUNCTION public.current_staff_id()
RETURNS UUID
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT id
  FROM public.staff
  WHERE auth_user_id = auth.uid()
    AND COALESCE(role, '') NOT LIKE 'ARCHIVED|%'
  LIMIT 1
$$;

CREATE OR REPLACE FUNCTION public.current_staff_role()
RETURNS TEXT
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COALESCE(split_part(role, '|', 1), '')
  FROM public.staff
  WHERE auth_user_id = auth.uid()
    AND COALESCE(role, '') NOT LIKE 'ARCHIVED|%'
  LIMIT 1
$$;

CREATE OR REPLACE FUNCTION public.current_staff_is(role_name TEXT)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT public.current_staff_role() = role_name
$$;

CREATE OR REPLACE FUNCTION public.current_staff_is_any(role_names TEXT[])
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT public.current_staff_role() = ANY(role_names)
$$;

ALTER TABLE public.staff ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.clients ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.appointments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.appointment_staff ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.appointment_extras ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.appointment_products ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.inventory ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.inventory_movements ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON public.staff FROM anon, authenticated;
GRANT SELECT (
  id, auth_user_id, email, name, role, commission_pct, active, created_at,
  image_url, phone, address, username, tools, washing_rate, birth_date
) ON public.staff TO authenticated;
GRANT INSERT (
  auth_user_id, email, name, role, commission_pct, active, created_at,
  image_url, phone, address, username, tools, washing_rate, birth_date
) ON public.staff TO authenticated;
GRANT UPDATE (
  auth_user_id, email, name, role, commission_pct, active, created_at,
  image_url, phone, address, username, tools, washing_rate, birth_date
) ON public.staff TO authenticated;

DROP POLICY IF EXISTS staff_select_gradual ON public.staff;
CREATE POLICY staff_select_gradual ON public.staff
FOR SELECT TO authenticated
USING (
  public.current_staff_is_any(ARRAY['Admin','Caja','Recepcionista'])
  OR auth_user_id = auth.uid()
);

DROP POLICY IF EXISTS staff_insert_admin ON public.staff;
CREATE POLICY staff_insert_admin ON public.staff
FOR INSERT TO authenticated
WITH CHECK (public.current_staff_is('Admin'));

DROP POLICY IF EXISTS staff_update_gradual ON public.staff;
CREATE POLICY staff_update_gradual ON public.staff
FOR UPDATE TO authenticated
USING (public.current_staff_is('Admin'))
WITH CHECK (public.current_staff_is('Admin'));

DROP POLICY IF EXISTS staff_delete_admin ON public.staff;
CREATE POLICY staff_delete_admin ON public.staff
FOR DELETE TO authenticated
USING (public.current_staff_is('Admin'));

DROP POLICY IF EXISTS clients_gradual ON public.clients;
CREATE POLICY clients_gradual ON public.clients
FOR ALL TO authenticated
USING (public.current_staff_role() IS NOT NULL)
WITH CHECK (public.current_staff_is_any(ARRAY['Admin','Caja','Recepcionista','Barbero']));

DROP POLICY IF EXISTS appointments_select_gradual ON public.appointments;
CREATE POLICY appointments_select_gradual ON public.appointments
FOR SELECT TO authenticated
USING (
  public.current_staff_is_any(ARRAY['Admin','Caja','Recepcionista'])
  OR staff_id = public.current_staff_id()
  OR EXISTS (
    SELECT 1 FROM public.appointment_staff aps
    WHERE aps.appointment_id = appointments.id
      AND aps.staff_id = public.current_staff_id()
  )
);

DROP POLICY IF EXISTS appointments_write_ops ON public.appointments;
CREATE POLICY appointments_write_ops ON public.appointments
FOR INSERT TO authenticated
WITH CHECK (public.current_staff_is_any(ARRAY['Admin','Caja','Recepcionista']));

DROP POLICY IF EXISTS appointments_update_ops ON public.appointments;
CREATE POLICY appointments_update_ops ON public.appointments
FOR UPDATE TO authenticated
USING (
  public.current_staff_is_any(ARRAY['Admin','Caja','Recepcionista'])
  OR staff_id = public.current_staff_id()
)
WITH CHECK (
  public.current_staff_is_any(ARRAY['Admin','Caja','Recepcionista'])
  OR staff_id = public.current_staff_id()
);

DROP POLICY IF EXISTS appointments_delete_admin ON public.appointments;
CREATE POLICY appointments_delete_admin ON public.appointments
FOR DELETE TO authenticated
USING (public.current_staff_is('Admin'));

DROP POLICY IF EXISTS appointment_staff_select_gradual ON public.appointment_staff;
CREATE POLICY appointment_staff_select_gradual ON public.appointment_staff
FOR SELECT TO authenticated
USING (
  public.current_staff_is_any(ARRAY['Admin','Caja','Recepcionista'])
  OR staff_id = public.current_staff_id()
);

DROP POLICY IF EXISTS appointment_staff_write_ops ON public.appointment_staff;
CREATE POLICY appointment_staff_write_ops ON public.appointment_staff
FOR ALL TO authenticated
USING (public.current_staff_is_any(ARRAY['Admin','Caja','Recepcionista']))
WITH CHECK (public.current_staff_is_any(ARRAY['Admin','Caja','Recepcionista']));

DROP POLICY IF EXISTS appointment_extras_gradual ON public.appointment_extras;
CREATE POLICY appointment_extras_gradual ON public.appointment_extras
FOR ALL TO authenticated
USING (
  public.current_staff_is_any(ARRAY['Admin','Caja','Recepcionista'])
  OR EXISTS (
    SELECT 1 FROM public.appointments a
    WHERE a.id = appointment_extras.appointment_id
      AND a.staff_id = public.current_staff_id()
  )
)
WITH CHECK (public.current_staff_is_any(ARRAY['Admin','Caja','Recepcionista']));

DROP POLICY IF EXISTS appointment_products_gradual ON public.appointment_products;
CREATE POLICY appointment_products_gradual ON public.appointment_products
FOR ALL TO authenticated
USING (
  public.current_staff_is_any(ARRAY['Admin','Caja','Recepcionista'])
  OR EXISTS (
    SELECT 1 FROM public.appointments a
    WHERE a.id = appointment_products.appointment_id
      AND a.staff_id = public.current_staff_id()
  )
)
WITH CHECK (public.current_staff_is_any(ARRAY['Admin','Caja','Recepcionista']));

DROP POLICY IF EXISTS transactions_gradual ON public.transactions;
CREATE POLICY transactions_gradual ON public.transactions
FOR ALL TO authenticated
USING (
  public.current_staff_is_any(ARRAY['Admin','Caja'])
  OR staff_id = public.current_staff_id()
  OR metadata->>'staffId' = public.current_staff_id()::text
)
WITH CHECK (public.current_staff_is_any(ARRAY['Admin','Caja']));

DROP POLICY IF EXISTS inventory_select_gradual ON public.inventory;
CREATE POLICY inventory_select_gradual ON public.inventory
FOR SELECT TO authenticated
USING (public.current_staff_role() IS NOT NULL);

DROP POLICY IF EXISTS inventory_write_ops ON public.inventory;
CREATE POLICY inventory_write_ops ON public.inventory
FOR ALL TO authenticated
USING (public.current_staff_is_any(ARRAY['Admin','Caja']))
WITH CHECK (public.current_staff_is_any(ARRAY['Admin','Caja']));

DROP POLICY IF EXISTS inventory_movements_gradual ON public.inventory_movements;
CREATE POLICY inventory_movements_gradual ON public.inventory_movements
FOR ALL TO authenticated
USING (public.current_staff_is_any(ARRAY['Admin','Caja']))
WITH CHECK (public.current_staff_is_any(ARRAY['Admin','Caja']));

COMMIT;
