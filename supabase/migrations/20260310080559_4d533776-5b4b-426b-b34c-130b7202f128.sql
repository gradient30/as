
-- Add hierarchical category support
ALTER TABLE public.categories ADD COLUMN IF NOT EXISTS parent_id uuid REFERENCES public.categories(id) ON DELETE CASCADE;
ALTER TABLE public.categories ADD COLUMN IF NOT EXISTS is_system boolean NOT NULL DEFAULT false;
ALTER TABLE public.categories ADD COLUMN IF NOT EXISTS is_approved boolean NOT NULL DEFAULT true;

-- Insert system built-in L1 categories
INSERT INTO public.categories (name, slug, keywords, created_by_token, is_system, is_approved)
VALUES 
  ('技术开发', 'tech-dev', ARRAY['技术','开发','编程','代码','框架','工具','前端','后端','数据库','API'], 'system', true, true),
  ('产品设计', 'product-design', ARRAY['产品','设计','UI','UX','交互','原型','用户体验','界面'], 'system', true, true),
  ('运营管理', 'ops-management', ARRAY['运营','管理','项目','团队','协作','流程','规范','策略'], 'system', true, true),
  ('学习笔记', 'study-notes', ARRAY['学习','笔记','读书','课程','总结','心得','教程','知识'], 'system', true, true),
  ('新闻时事', 'news-current', ARRAY['新闻','时事','资讯','热点','事件','报道','动态'], 'system', true, true)
ON CONFLICT DO NOTHING;
