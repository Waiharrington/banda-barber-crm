CREATE TABLE public.appointment_products (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    appointment_id UUID REFERENCES public.appointments(id) ON DELETE CASCADE,
    product_id UUID REFERENCES public.inventory(id) ON DELETE CASCADE,
    quantity NUMERIC DEFAULT 1,
    price NUMERIC DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
