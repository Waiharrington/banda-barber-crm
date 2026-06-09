-- AstroBarber Database Indexes Optimization
-- Crea índices en las llaves foráneas para acelerar consultas y JOINs

CREATE INDEX IF NOT EXISTS idx_appointments_client_id ON public.appointments(client_id);
CREATE INDEX IF NOT EXISTS idx_appointments_service_id ON public.appointments(service_id);
CREATE INDEX IF NOT EXISTS idx_appointments_staff_id ON public.appointments(staff_id);

CREATE INDEX IF NOT EXISTS idx_appointment_staff_appointment_id ON public.appointment_staff(appointment_id);
CREATE INDEX IF NOT EXISTS idx_appointment_staff_staff_id ON public.appointment_staff(staff_id);

CREATE INDEX IF NOT EXISTS idx_appointment_extras_appointment_id ON public.appointment_extras(appointment_id);
CREATE INDEX IF NOT EXISTS idx_appointment_extras_extra_id ON public.appointment_extras(extra_id);

CREATE INDEX IF NOT EXISTS idx_appointment_products_appointment_id ON public.appointment_products(appointment_id);
CREATE INDEX IF NOT EXISTS idx_appointment_products_product_id ON public.appointment_products(product_id);

CREATE INDEX IF NOT EXISTS idx_transactions_staff_id ON public.transactions(staff_id);
CREATE INDEX IF NOT EXISTS idx_transactions_client_id ON public.transactions(client_id);

CREATE INDEX IF NOT EXISTS idx_inventory_movements_product_id ON public.inventory_movements(product_id);
