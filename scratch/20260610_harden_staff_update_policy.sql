-- Hardening patch after the initial Auth/RLS migration.
-- Restricts staff row updates to Admin only, so non-admin users cannot change role or permissions from the browser console.

DROP POLICY IF EXISTS staff_update_gradual ON public.staff;

CREATE POLICY staff_update_gradual ON public.staff
FOR UPDATE TO authenticated
USING (public.current_staff_is('Admin'))
WITH CHECK (public.current_staff_is('Admin'));
