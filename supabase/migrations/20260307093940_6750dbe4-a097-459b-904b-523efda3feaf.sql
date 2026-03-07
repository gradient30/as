
-- Create entry status enum
CREATE TYPE public.entry_status AS ENUM ('approved', 'pending', 'merged');

-- Create categories table
CREATE TABLE public.categories (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL UNIQUE,
  slug TEXT NOT NULL UNIQUE,
  keywords TEXT[] NOT NULL DEFAULT '{}',
  created_by_token TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create entries table
CREATE TABLE public.entries (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  title TEXT NOT NULL,
  content TEXT NOT NULL,
  category_id UUID REFERENCES public.categories(id) ON DELETE CASCADE,
  author_token TEXT NOT NULL,
  status public.entry_status NOT NULL DEFAULT 'approved',
  contributors TEXT[] NOT NULL DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create entry_merges table (merge history)
CREATE TABLE public.entry_merges (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  target_entry_id UUID REFERENCES public.entries(id) ON DELETE CASCADE NOT NULL,
  source_title TEXT NOT NULL,
  source_content TEXT NOT NULL,
  merged_by_token TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create category_admins table
CREATE TABLE public.category_admins (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  category_id UUID REFERENCES public.categories(id) ON DELETE CASCADE NOT NULL,
  admin_token TEXT NOT NULL,
  is_founder BOOLEAN NOT NULL DEFAULT false,
  auto_merge_enabled BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(category_id, admin_token)
);

-- Enable RLS on all tables
ALTER TABLE public.categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.entries ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.entry_merges ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.category_admins ENABLE ROW LEVEL SECURITY;

-- Categories: anyone can read, anyone can insert
CREATE POLICY "Anyone can read categories" ON public.categories FOR SELECT USING (true);
CREATE POLICY "Anyone can insert categories" ON public.categories FOR INSERT WITH CHECK (true);
CREATE POLICY "Anyone can update categories" ON public.categories FOR UPDATE USING (true);

-- Entries: anyone can read approved, anyone can insert
CREATE POLICY "Anyone can read entries" ON public.entries FOR SELECT USING (true);
CREATE POLICY "Anyone can insert entries" ON public.entries FOR INSERT WITH CHECK (true);
CREATE POLICY "Anyone can update entries" ON public.entries FOR UPDATE USING (true);
CREATE POLICY "Anyone can delete entries" ON public.entries FOR DELETE USING (true);

-- Entry merges: anyone can read, anyone can insert
CREATE POLICY "Anyone can read merges" ON public.entry_merges FOR SELECT USING (true);
CREATE POLICY "Anyone can insert merges" ON public.entry_merges FOR INSERT WITH CHECK (true);

-- Category admins: anyone can read, anyone can insert
CREATE POLICY "Anyone can read admins" ON public.category_admins FOR SELECT USING (true);
CREATE POLICY "Anyone can insert admins" ON public.category_admins FOR INSERT WITH CHECK (true);
CREATE POLICY "Anyone can update admins" ON public.category_admins FOR UPDATE USING (true);

-- Indexes
CREATE INDEX idx_entries_category ON public.entries(category_id);
CREATE INDEX idx_entries_status ON public.entries(status);
CREATE INDEX idx_entries_author ON public.entries(author_token);
CREATE INDEX idx_category_admins_token ON public.category_admins(admin_token);

-- Update timestamp function
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

CREATE TRIGGER update_entries_updated_at
  BEFORE UPDATE ON public.entries
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
