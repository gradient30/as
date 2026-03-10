-- Create entry_views table to track each view event
CREATE TABLE public.entry_views (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  entry_id uuid NOT NULL REFERENCES public.entries(id) ON DELETE CASCADE,
  viewer_token text NOT NULL,
  viewer_user_id uuid,
  viewed_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Index for efficient querying
CREATE INDEX idx_entry_views_entry_id ON public.entry_views(entry_id);
CREATE INDEX idx_entry_views_viewed_at ON public.entry_views(viewed_at);

-- Add view_count and last_viewed_at to entries
ALTER TABLE public.entries ADD COLUMN view_count integer NOT NULL DEFAULT 0;
ALTER TABLE public.entries ADD COLUMN last_viewed_at timestamp with time zone;

-- Enable RLS
ALTER TABLE public.entry_views ENABLE ROW LEVEL SECURITY;

-- Public read/insert for entry_views
CREATE POLICY "Anyone can read entry_views" ON public.entry_views FOR SELECT TO public USING (true);
CREATE POLICY "Anyone can insert entry_views" ON public.entry_views FOR INSERT TO public WITH CHECK (true);

-- Enable realtime for entry_views is not needed