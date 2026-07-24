ALTER TABLE pandabarber.clients
ADD COLUMN IF NOT EXISTS origin TEXT;

COMMENT ON COLUMN pandabarber.clients.origin IS
'Canal por el que el cliente conocio Panda Barber';

CREATE INDEX IF NOT EXISTS clients_origin_idx
ON pandabarber.clients (origin);
