import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export type HotNewsItem = {
  id: string;
  source_name: string;
  source_url: string;
  title: string;
  content: string;
  keywords: string[];
  news_date: string;
  scraped_at: string;
  is_visible: boolean;
};

export type HotNewsSource = {
  id: string;
  name: string;
  url: string;
  keywords: string[];
  max_items: number;
  is_enabled: boolean;
  created_at: string;
};

export function useHotNews() {
  return useQuery({
    queryKey: ['hot-news'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('hot_news')
        .select('*')
        .eq('is_visible', true)
        .order('news_date', { ascending: false })
        .order('scraped_at', { ascending: false })
        .limit(50);
      if (error) throw error;
      return data as HotNewsItem[];
    },
  });
}

export function useHotNewsSources() {
  return useQuery({
    queryKey: ['hot-news-sources'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('hot_news_sources')
        .select('*')
        .order('name');
      if (error) throw error;
      return data as HotNewsSource[];
    },
  });
}

export function useScrapeHotNews() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (sourceIds?: string[]) => {
      const { data, error } = await supabase.functions.invoke('scrape-hot-news', {
        body: { source_ids: sourceIds },
      });
      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['hot-news'] });
      const okCount = data?.results?.filter((r: any) => r.status === 'ok').length || 0;
      toast.success(`抓取完成，成功 ${okCount} 个源`);
    },
    onError: (err: any) => {
      toast.error('抓取失败: ' + (err.message || '未知错误'));
    },
  });
}

export function useAddHotNewsSource() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (source: { name: string; url: string; keywords: string[]; max_items: number }) => {
      const { error } = await supabase.from('hot_news_sources').insert(source);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['hot-news-sources'] });
      toast.success('数据源已添加');
    },
    onError: () => toast.error('添加失败'),
  });
}

export function useToggleHotNewsSource() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, is_enabled }: { id: string; is_enabled: boolean }) => {
      const { error } = await supabase.from('hot_news_sources').update({ is_enabled }).eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['hot-news-sources'] }),
  });
}

export function useDeleteHotNewsSource() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('hot_news_sources').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['hot-news-sources'] });
      toast.success('数据源已删除');
    },
  });
}
