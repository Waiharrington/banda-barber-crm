-- Migración para crear TurnQueue y Coupons

CREATE TABLE IF NOT EXISTS public.turn_queue (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    staff_id UUID NOT NULL REFERENCES public.staff(id) ON DELETE CASCADE,
    position INTEGER NOT NULL,
    status TEXT DEFAULT 'AVAILABLE', -- 'AVAILABLE', 'BUSY', 'ABSENT'
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    CONSTRAINT unique_position UNIQUE (position) DEFERRABLE INITIALLY DEFERRED
);

CREATE TABLE IF NOT EXISTS public.coupons (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    client_id UUID REFERENCES public.clients(id) ON DELETE CASCADE,
    prize_name TEXT NOT NULL,
    status TEXT DEFAULT 'UNUSED', -- 'UNUSED', 'USED'
    generated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    redeemed_at TIMESTAMP WITH TIME ZONE
);
