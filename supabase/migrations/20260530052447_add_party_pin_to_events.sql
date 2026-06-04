-- Add party_pin_hash and party_pin columns to events table for enhanced security and creator retrieval
ALTER TABLE public.events ADD COLUMN IF NOT EXISTS party_pin_hash text;
ALTER TABLE public.events ADD COLUMN IF NOT EXISTS party_pin text;
