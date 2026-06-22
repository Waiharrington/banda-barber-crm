CREATE TABLE IF NOT EXISTS public.system_settings (
    key text PRIMARY KEY,
    value text NOT NULL,
    updated_at timestamp with time zone DEFAULT now()
);

-- Insert defaults
INSERT INTO public.system_settings (key, value) VALUES
('whatsapp_template_followup', '👋 ¡Hola {{nombre}}! Ya ha pasado el tiempo estimado desde tu último corte en Panda Barber Studio. 🐼💈\n\nTe sugerimos agendar tu próxima visita con tu barbero habitual para mantener tu estilo al día. ¡Te esperamos!\n\nReserva en segundos aquí: https://pandabarber.com/#/agendar'),
('whatsapp_template_birthday', '🎉 ¡Hola {{nombre}}! ¡Feliz Cumpleaños de parte del equipo de Panda Barber Studio! 🎂🐼\n\nQueremos consentirte en tu día especial, por lo que si vienes HOY y juegas nuestra Ruleta de Cumpleaños, te llevarás un premio asegurado.\n\nReserva tu turno aquí: https://pandabarber.com/#/agendar')
ON CONFLICT (key) DO NOTHING;

-- RLS Policies
ALTER TABLE public.system_settings ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Enable read access for all users" ON public.system_settings;
CREATE POLICY "Enable read access for all users" ON public.system_settings FOR SELECT USING (true);

DROP POLICY IF EXISTS "Enable insert access for authenticated users" ON public.system_settings;
CREATE POLICY "Enable insert access for authenticated users" ON public.system_settings FOR INSERT WITH CHECK (true);

DROP POLICY IF EXISTS "Enable update access for authenticated users" ON public.system_settings;
CREATE POLICY "Enable update access for authenticated users" ON public.system_settings FOR UPDATE USING (true);
