ALTER TABLE public.locations
  ADD COLUMN IF NOT EXISTS business_status text
    CHECK (business_status IN ('OPERATIONAL', 'CLOSED_TEMPORARILY', 'CLOSED_PERMANENTLY'));