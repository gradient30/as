
-- Hot news items table
CREATE TABLE public.hot_news (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  source_name text NOT NULL,
  source_url text NOT NULL,
  title text NOT NULL,
  content text NOT NULL,
  keywords text[] NOT NULL DEFAULT '{}',
  news_date date NOT NULL DEFAULT CURRENT_DATE,
  scraped_at timestamptz NOT NULL DEFAULT now(),
  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  is_visible boolean NOT NULL DEFAULT true
);

ALTER TABLE public.hot_news ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read visible hot_news" ON public.hot_news FOR SELECT TO public USING (is_visible = true);
CREATE POLICY "Admins can manage hot_news" ON public.hot_news FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin'));

-- Hot news sources (configurable scrape targets)
CREATE TABLE public.hot_news_sources (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  url text NOT NULL,
  keywords text[] NOT NULL DEFAULT '{}',
  max_items integer NOT NULL DEFAULT 2,
  is_enabled boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL
);

ALTER TABLE public.hot_news_sources ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read sources" ON public.hot_news_sources FOR SELECT TO public USING (true);
CREATE POLICY "Admins can manage sources" ON public.hot_news_sources FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin'));

-- Insert default sources
INSERT INTO public.hot_news_sources (name, url, keywords, max_items) VALUES
  ('Anthropic', 'https://www.anthropic.com/news', ARRAY['AI', 'Claude', 'safety'], 2),
  ('ChatGPT', 'https://openai.com/blog', ARRAY['ChatGPT', 'OpenAI', 'GPT'], 2),
  ('Google AI', 'https://blog.google/technology/ai/', ARRAY['Google', 'Gemini', 'AI'], 2),
  ('Meta AI', 'https://ai.meta.com/blog/', ARRAY['Meta', 'LLaMA', 'AI'], 2),
  ('Grok', 'https://x.ai/blog', ARRAY['Grok', 'xAI'], 2),
  ('X/Twitter', 'https://blog.x.com', ARRAY['X', 'Twitter'], 2),
  ('DeepSeek', 'https://www.deepseek.com', ARRAY['DeepSeek', 'AI'], 2),
  ('Alibaba AI', 'https://www.alibabacloud.com/blog', ARRAY['Alibaba', 'Qwen', '通义'], 2),
  ('月之暗面', 'https://www.moonshot.cn', ARRAY['Kimi', '月之暗面', 'AI'], 2),
  ('智谱AI', 'https://www.zhipuai.cn', ARRAY['智谱', 'GLM', 'AI'], 2),
  ('MiniMax', 'https://www.minimaxi.com', ARRAY['MiniMax', '海螺', 'AI'], 2);
