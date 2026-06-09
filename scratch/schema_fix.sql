-- Supabase Schema Fix for AstroBarber

-- DROP existing tables to start fresh
DROP TABLE IF EXISTS public.transactions CASCADE;
DROP TABLE IF EXISTS public.inventory_movements CASCADE;
DROP TABLE IF EXISTS public.appointment_extras CASCADE;
DROP TABLE IF EXISTS public.appointment_staff CASCADE;
DROP TABLE IF EXISTS public.appointments CASCADE;
DROP TABLE IF EXISTS public.service_checklist_items CASCADE;
DROP TABLE IF EXISTS public.service_extras CASCADE;
DROP TABLE IF EXISTS public.services CASCADE;
DROP TABLE IF EXISTS public.inventory CASCADE;
DROP TABLE IF EXISTS public.staff CASCADE;
DROP TABLE IF EXISTS public.clients CASCADE;
DROP TABLE IF EXISTS public.notifications CASCADE;

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 1. clients
CREATE TABLE public.clients (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT,
    phone TEXT,
    hair_type TEXT,
    scalp_type TEXT,
    last_product_used TEXT,
    total_visits INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE,
    id_card TEXT,
    work_gallery JSONB,
    birth_date TEXT
);

-- 2. staff
CREATE TABLE public.staff (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT,
    role TEXT,
    commission_pct NUMERIC,
    active BOOLEAN,
    created_at TIMESTAMP WITH TIME ZONE,
    image_url TEXT,
    phone TEXT,
    address TEXT,
    username TEXT,
    password TEXT,
    tools TEXT,
    washing_rate NUMERIC,
    birth_date TEXT
);

-- 3. services
CREATE TABLE public.services (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT,
    price NUMERIC,
    category TEXT,
    created_at TIMESTAMP WITH TIME ZONE,
    strategy_type TEXT,
    duration INTEGER,
    insumo_cost NUMERIC,
    included_items JSONB,
    commission_barber NUMERIC,
    commission_washer NUMERIC,
    commission_cashier NUMERIC,
    commission_receptionist NUMERIC,
    variable_cost NUMERIC,
    image_url TEXT,
    description TEXT
);

-- 4. inventory
CREATE TABLE public.inventory (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT,
    stock NUMERIC,
    price NUMERIC,
    is_for_sale BOOLEAN,
    updated_at TIMESTAMP WITH TIME ZONE,
    category TEXT,
    cost_price NUMERIC,
    image_url TEXT,
    commission_pct NUMERIC
);

-- 5. service_extras
CREATE TABLE public.service_extras (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT,
    price NUMERIC,
    cost NUMERIC,
    created_at TIMESTAMP WITH TIME ZONE
);

-- 6. service_checklist_items
CREATE TABLE public.service_checklist_items (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT,
    created_at TIMESTAMP WITH TIME ZONE,
    base_cost NUMERIC
);

-- 7. appointments
CREATE TABLE public.appointments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    client_id UUID REFERENCES public.clients(id) ON DELETE SET NULL,
    service_id UUID REFERENCES public.services(id) ON DELETE SET NULL,
    total_price NUMERIC,
    created_at TIMESTAMP WITH TIME ZONE,
    staff_id UUID REFERENCES public.staff(id) ON DELETE SET NULL,
    status TEXT,
    started_at TIMESTAMP WITH TIME ZONE,
    scheduled_at TIMESTAMP WITH TIME ZONE,
    completed_at TIMESTAMP WITH TIME ZONE
);

-- 8. appointment_staff
CREATE TABLE public.appointment_staff (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    appointment_id UUID REFERENCES public.appointments(id) ON DELETE CASCADE,
    staff_id UUID REFERENCES public.staff(id) ON DELETE CASCADE,
    commission_earned NUMERIC,
    product_commission NUMERIC,
    tip_amount NUMERIC
);

-- 9. appointment_extras
CREATE TABLE public.appointment_extras (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    appointment_id UUID REFERENCES public.appointments(id) ON DELETE CASCADE,
    extra_id UUID REFERENCES public.service_extras(id) ON DELETE CASCADE,
    price NUMERIC,
    created_at TIMESTAMP WITH TIME ZONE
);

-- 10. inventory_movements
CREATE TABLE public.inventory_movements (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    product_id UUID REFERENCES public.inventory(id) ON DELETE CASCADE,
    type TEXT,
    amount NUMERIC,
    reason TEXT,
    created_at TIMESTAMP WITH TIME ZONE
);

-- 11. transactions
CREATE TABLE public.transactions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    type TEXT,
    amount NUMERIC,
    currency TEXT,
    description TEXT,
    category TEXT,
    date TEXT,
    time TEXT,
    staff_id UUID REFERENCES public.staff(id) ON DELETE SET NULL,
    client_id UUID REFERENCES public.clients(id) ON DELETE SET NULL,
    payment_method TEXT,
    status TEXT,
    reference TEXT,
    created_at TIMESTAMP WITH TIME ZONE,
    metadata JSONB
);

-- 12. notifications
CREATE TABLE public.notifications (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    title TEXT,
    message TEXT,
    type TEXT,
    read BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE,
    link TEXT,
    metadata JSONB
);
