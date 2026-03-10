
ALTER TABLE public.entries 
  ADD COLUMN is_private boolean NOT NULL DEFAULT false,
  ADD COLUMN share_token text DEFAULT NULL;
