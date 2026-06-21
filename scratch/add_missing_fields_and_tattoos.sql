-- Migración para añadir bebida de cortesía, fecha de nacimiento del cliente e indicador de tatuajes
ALTER TABLE public.clients ADD COLUMN IF NOT EXISTS birth_date DATE;
ALTER TABLE public.services ADD COLUMN IF NOT EXISTS is_tattoo BOOLEAN DEFAULT FALSE;
ALTER TABLE public.appointments ADD COLUMN IF NOT EXISTS beverage_selection TEXT;
