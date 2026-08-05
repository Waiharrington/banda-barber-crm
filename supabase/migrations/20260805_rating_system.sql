-- Migration: Rating system for barbers
-- Execute this in Supabase SQL Editor as postgres role

-- 1. Add new columns to staff_reviews
ALTER TABLE pandabarber.staff_reviews 
  ADD COLUMN IF NOT EXISTS client_id uuid,
  ADD COLUMN IF NOT EXISTS appointment_id uuid,
  ADD COLUMN IF NOT EXISTS rapidez smallint CHECK (rapidez >= 1 AND rapidez <= 5),
  ADD COLUMN IF NOT EXISTS limpieza smallint CHECK (limpieza >= 1 AND limpieza <= 5),
  ADD COLUMN IF NOT EXISTS habilidad smallint CHECK (habilidad >= 1 AND habilidad <= 5);

-- 2. Add unique constraint: one review per appointment per client
ALTER TABLE pandabarber.staff_reviews 
  ADD CONSTRAINT unique_review_per_appointment 
  UNIQUE (appointment_id);

-- 3. Allow anon to insert reviews (clients without auth can also rate)
CREATE POLICY "anon_insert_reviews" 
ON pandabarber.staff_reviews 
FOR INSERT 
TO anon 
WITH CHECK (true);

-- 4. Allow anon to read reviews (for displaying ratings)
CREATE POLICY "anon_select_reviews" 
ON pandabarber.staff_reviews 
FOR SELECT 
TO anon 
USING (true);
