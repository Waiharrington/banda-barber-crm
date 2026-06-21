-- 1. Agregar columna de conteo de turnos saltados (clientes dejados escapar) a staff
ALTER TABLE public.staff ADD COLUMN IF NOT EXISTS skipped_count INTEGER DEFAULT 0;

-- 2. Crear tabla de reseñas anónimas de barberos
CREATE TABLE IF NOT EXISTS public.staff_reviews (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    staff_id UUID NOT NULL REFERENCES public.staff(id) ON DELETE CASCADE,
    rating INTEGER NOT NULL CHECK (rating >= 1 AND rating <= 5),
    comment TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 3. Desactivar RLS para permitir el envío de reseñas anónimas desde el portal público
ALTER TABLE public.staff_reviews DISABLE ROW LEVEL SECURITY;
