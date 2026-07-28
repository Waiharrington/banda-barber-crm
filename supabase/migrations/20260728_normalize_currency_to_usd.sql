BEGIN;

UPDATE pandabarber.transactions
SET currency = 'USD'
WHERE currency = 'EUR';

COMMIT;
