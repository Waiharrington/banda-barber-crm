BEGIN;

-- La comisión por servicios se define por profesional, no por servicio.
-- Barberos y tatuadores usan 60%, salvo Moret Serrano que usa 70%.
UPDATE pandabarber.staff
SET commission_pct = 60
WHERE
  split_part(role, '|', 1) ILIKE '%barber%'
  OR split_part(role, '|', 1) ILIKE '%tatu%';

UPDATE pandabarber.staff
SET commission_pct = 70
WHERE
  name ILIKE 'Moret Serrano%'
  AND split_part(role, '|', 1) ILIKE '%barber%';

COMMIT;

NOTIFY pgrst, 'reload schema';
