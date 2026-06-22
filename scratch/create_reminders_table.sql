CREATE TABLE IF NOT EXISTS public.scheduled_reminders (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    client_id uuid REFERENCES public.clients(id) ON DELETE CASCADE,
    appointment_id uuid REFERENCES public.appointments(id) ON DELETE CASCADE,
    scheduled_for timestamp with time zone NOT NULL,
    type text NOT NULL,
    status text DEFAULT 'pending'::text,
    created_at timestamp with time zone DEFAULT now()
);

-- Habilitar RLS
ALTER TABLE public.scheduled_reminders ENABLE ROW LEVEL SECURITY;

-- Políticas de RLS
DROP POLICY IF EXISTS "Enable read access for all users" ON public.scheduled_reminders;
CREATE POLICY "Enable read access for all users" ON public.scheduled_reminders FOR SELECT USING (true);

DROP POLICY IF EXISTS "Enable insert access for authenticated users" ON public.scheduled_reminders;
CREATE POLICY "Enable insert access for authenticated users" ON public.scheduled_reminders FOR INSERT WITH CHECK (true);

DROP POLICY IF EXISTS "Enable update access for all users" ON public.scheduled_reminders;
CREATE POLICY "Enable update access for all users" ON public.scheduled_reminders FOR UPDATE USING (true);
