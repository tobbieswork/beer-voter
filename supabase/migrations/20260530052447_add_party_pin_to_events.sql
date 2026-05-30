-- Add party_pin column to events table to allow creator retrieval
ALTER TABLE public.events ADD COLUMN IF NOT EXISTS party_pin text;
