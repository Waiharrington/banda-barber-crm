-- Supabase Schema for AstroBarber

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Table: clients
CREATE TABLE IF NOT EXISTS public.clients (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT NOT NULL,
    phone TEXT,
    cedula TEXT,
    email TEXT,
    status TEXT DEFAULT 'Activo',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    points INTEGER DEFAULT 0,
    last_visit TIMESTAMP WITH TIME ZONE
);

-- Table: staff
CREATE TABLE IF NOT EXISTS public.staff (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT NOT NULL,
    role TEXT DEFAULT 'Barbero',
    commission_pct NUMERIC DEFAULT 40,
    active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    image_url TEXT,
    phone TEXT,
    address TEXT,
    username TEXT,
    password TEXT,
    tools TEXT,
    washing_rate NUMERIC DEFAULT 0,
    birth_date DATE
);

-- Table: services
CREATE TABLE IF NOT EXISTS public.services (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT NOT NULL,
    price NUMERIC NOT NULL,
    duration INTEGER DEFAULT 30,
    active BOOLEAN DEFAULT TRUE,
    is_combo BOOLEAN DEFAULT FALSE,
    is_extra BOOLEAN DEFAULT FALSE
);

-- Table: service_extras
CREATE TABLE IF NOT EXISTS public.service_extras (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    service_id UUID REFERENCES public.services(id) ON DELETE CASCADE,
    extra_id UUID REFERENCES public.services(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Table: service_checklist_items
CREATE TABLE IF NOT EXISTS public.service_checklist_items (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    service_id UUID REFERENCES public.services(id) ON DELETE CASCADE,
    task TEXT NOT NULL,
    is_required BOOLEAN DEFAULT TRUE
);

-- Table: transactions
CREATE TABLE IF NOT EXISTS public.transactions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    type TEXT NOT NULL,
    amount NUMERIC NOT NULL,
    category TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    description TEXT,
    exchange_rate NUMERIC,
    currency TEXT DEFAULT 'USD',
    metadata JSONB DEFAULT '{}'::jsonb
);

-- Table: inventory
CREATE TABLE IF NOT EXISTS public.inventory (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    code TEXT,
    name TEXT NOT NULL,
    category TEXT,
    quantity NUMERIC DEFAULT 0,
    unit TEXT,
    min_stock NUMERIC DEFAULT 0,
    price NUMERIC DEFAULT 0,
    last_updated TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Table: inventory_movements
CREATE TABLE IF NOT EXISTS public.inventory_movements (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    product_id UUID REFERENCES public.inventory(id) ON DELETE CASCADE,
    type TEXT NOT NULL,
    quantity NUMERIC NOT NULL,
    reason TEXT,
    date TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    staff_id UUID REFERENCES public.staff(id) ON DELETE SET NULL
);

-- Table: appointments
CREATE TABLE IF NOT EXISTS public.appointments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    client_id UUID REFERENCES public.clients(id) ON DELETE SET NULL,
    start_time TIMESTAMP WITH TIME ZONE NOT NULL,
    end_time TIMESTAMP WITH TIME ZONE NOT NULL,
    status TEXT DEFAULT 'Programado',
    notes TEXT,
    total_price NUMERIC DEFAULT 0,
    commission_amount NUMERIC DEFAULT 0,
    wash_commission NUMERIC DEFAULT 0,
    points_earned INTEGER DEFAULT 0,
    has_washed BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Table: appointment_staff
CREATE TABLE IF NOT EXISTS public.appointment_staff (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    appointment_id UUID REFERENCES public.appointments(id) ON DELETE CASCADE,
    staff_id UUID REFERENCES public.staff(id) ON DELETE CASCADE,
    role TEXT DEFAULT 'Principal',
    commission_amount NUMERIC DEFAULT 0
);

-- Table: appointment_extras
CREATE TABLE IF NOT EXISTS public.appointment_extras (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    appointment_id UUID REFERENCES public.appointments(id) ON DELETE CASCADE,
    extra_id UUID REFERENCES public.services(id) ON DELETE CASCADE,
    quantity INTEGER DEFAULT 1,
    price NUMERIC DEFAULT 0
);

-- Table: notifications
CREATE TABLE IF NOT EXISTS public.notifications (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    title TEXT NOT NULL,
    message TEXT NOT NULL,
    type TEXT DEFAULT 'info',
    read BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    link TEXT,
    metadata JSONB DEFAULT '{}'::jsonb
);

-- Allow completely open access for this CRM (No Row Level Security policies required)
-- If RLS is enabled on Supabase by default for new tables, we can just leave it disabled or create open policies.
