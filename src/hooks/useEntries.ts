import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { getAuthorToken } from '@/lib/author-token';
import {
  extractKeywords,
  findBestCategory,
  calculateSimilarity,
  generateCategoryName,
  generateSlug,
  MERGE_THRESHOLD,
} from '@/lib/categorization';
import { toast } from 'sonner';

export type EntryWithCategory = {
  id: string;
  title: string;
  content: string;
  category_id: string | null;
  author_token: string;
  status: 'approved' | 'pending' | 'merged';
  contributors: string[];
  created_at: string;
  updated_at: string;
  is_private: boolean;
  share_token: string | null;
  categories: { id: string; name: string; slug: string } | null;
};

function generateShareToken(): string {
  return crypto.randomUUID().replace(/-/g, '').slice(0, 16);
}

export function useEntries(categoryFilter?: string) {
  const authorToken = getAuthorToken();

  return useQuery({
    queryKey: ['entries', categoryFilter],
    queryFn: async () => {
      let query = supabase
        .from('entries')
        .select('*, categories(id, name, slug)')
        .eq('status', 'approved')
        .order('created_at', { ascending: false });

      if (categoryFilter) {
        query = query.eq('category_id', categoryFilter);
      }

      const { data, error } = await query;
      if (error) throw error;

      // Client-side filter: show public entries + own private entries
      const entries = (data as unknown as EntryWithCategory[]).filter(
        (e) => !e.is_private || e.author_token === authorToken
      );

      return entries;
    },
  });
}

/** Fetch a single entry by ID, optionally with share token for private entries */
export function useEntryById(entryId?: string, shareToken?: string) {
  const authorToken = getAuthorToken();

  return useQuery({
    queryKey: ['entry', entryId, shareToken],
    enabled: !!entryId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('entries')
        .select('*, categories(id, name, slug)')
        .eq('id', entryId!)
        .single();

      if (error) throw error;
      const entry = data as unknown as EntryWithCategory;

      // Access check: public, own, or valid share token
      if (entry.is_private) {
        if (entry.author_token !== authorToken && entry.share_token !== shareToken) {
          throw new Error('无权访问该知识');
        }
      }

      return entry;
    },
  });
}

export function useCategories() {
  return useQuery({
    queryKey: ['categories'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('categories')
        .select('*')
        .order('created_at', { ascending: true });
      if (error) throw error;
      return data;
    },
  });
}

export function useCategoryAdmins(categoryId?: string) {
  return useQuery({
    queryKey: ['category_admins', categoryId],
    enabled: !!categoryId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('category_admins')
        .select('*')
        .eq('category_id', categoryId!);
      if (error) throw error;
      return data;
    },
  });
}

export function usePendingEntries(categoryId?: string) {
  return useQuery({
    queryKey: ['pending_entries', categoryId],
    enabled: !!categoryId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('entries')
        .select('*, categories(id, name, slug)')
        .eq('status', 'pending')
        .eq('category_id', categoryId!)
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data as unknown as EntryWithCategory[];
    },
  });
}

export function useSubmitEntry() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({ title, content, is_private = false }: { title: string; content: string; is_private?: boolean }) => {
      const authorToken = getAuthorToken();
      const keywords = extractKeywords(title + ' ' + content);

      // Generate share token for private entries
      const shareToken = is_private ? generateShareToken() : null;

      // 1. Get all categories
      const { data: categories } = await supabase
        .from('categories')
        .select('id, name, keywords, slug');

      const existingCategories = categories || [];
      const bestCategory = findBestCategory(keywords, existingCategories);

      let categoryId: string;
      let isNewCategory = false;

      if (bestCategory) {
        categoryId = bestCategory.categoryId;

        // Update category keywords (union)
        const existingCat = existingCategories.find(c => c.id === categoryId);
        if (existingCat) {
          const mergedKeywords = [...new Set([...existingCat.keywords, ...keywords])];
          await supabase
            .from('categories')
            .update({ keywords: mergedKeywords })
            .eq('id', categoryId);
        }
      } else {
        // Create new category
        isNewCategory = true;
        const catName = generateCategoryName(keywords);
        const slug = generateSlug(catName) + '-' + Date.now();

        const { data: newCat, error: catError } = await supabase
          .from('categories')
          .insert({ name: catName, slug, keywords, created_by_token: authorToken })
          .select()
          .single();

        if (catError) throw catError;
        categoryId = newCat.id;

        // Make submitter the founder admin
        await supabase.from('category_admins').insert({
          category_id: categoryId,
          admin_token: authorToken,
          is_founder: true,
          auto_merge_enabled: true,
        });
      }

      // 2. Private entries skip similarity check — create directly
      if (is_private) {
        const { error } = await supabase.from('entries').insert({
          title,
          content,
          category_id: categoryId,
          author_token: authorToken,
          status: 'approved' as const,
          contributors: [authorToken],
          is_private: true,
          share_token: shareToken,
        });
        if (error) throw error;
        toast.success('私密知识已成功录入！');
        return;
      }

      // 3. Check similarity with existing entries in the same category
      const { data: existingEntries } = await supabase
        .from('entries')
        .select('*')
        .eq('category_id', categoryId)
        .eq('status', 'approved')
        .eq('is_private', false);

      let merged = false;
      if (existingEntries && existingEntries.length > 0) {
        for (const entry of existingEntries) {
          const entryKeywords = extractKeywords(entry.title + ' ' + entry.content);
          const similarity = calculateSimilarity(keywords, entryKeywords);

          if (similarity >= MERGE_THRESHOLD) {
            const { data: admins } = await supabase
              .from('category_admins')
              .select('auto_merge_enabled')
              .eq('category_id', categoryId)
              .limit(1);

            const autoMerge = admins?.[0]?.auto_merge_enabled ?? true;

            if (autoMerge) {
              const mergedContent = entry.content + '\n\n---\n\n' + content;
              const contributors = [...new Set([...entry.contributors, authorToken])];

              await supabase
                .from('entries')
                .update({ content: mergedContent, contributors })
                .eq('id', entry.id);

              await supabase.from('entry_merges').insert({
                target_entry_id: entry.id,
                source_title: title,
                source_content: content,
                merged_by_token: authorToken,
              });

              merged = true;
              toast.success('知识已合并到已有条目中');
              break;
            } else {
              const { error } = await supabase.from('entries').insert({
                title,
                content,
                category_id: categoryId,
                author_token: authorToken,
                status: 'pending' as const,
                contributors: [authorToken],
              });
              if (error) throw error;
              merged = true;
              toast.info('知识已提交，等待管理员审核');
              break;
            }
          }
        }
      }

      // 4. If not merged, create new entry
      if (!merged) {
        const { error } = await supabase.from('entries').insert({
          title,
          content,
          category_id: categoryId,
          author_token: authorToken,
          status: 'approved' as const,
          contributors: [authorToken],
        });
        if (error) throw error;

        if (!isNewCategory) {
          const { data: admins } = await supabase
            .from('category_admins')
            .select('admin_token')
            .eq('category_id', categoryId);
          
          const isAdmin = admins?.some(a => a.admin_token === authorToken);
          if (!isAdmin && (!admins || admins.length === 0)) {
            await supabase.from('category_admins').insert({
              category_id: categoryId,
              admin_token: authorToken,
              is_founder: true,
            });
          }
        }

        toast.success('知识已成功录入！');
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['entries'] });
      queryClient.invalidateQueries({ queryKey: ['categories'] });
    },
    onError: (err) => {
      toast.error('提交失败: ' + (err as Error).message);
    },
  });
}

export function useDeleteEntry() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (entryId: string) => {
      const { error } = await supabase.from('entries').delete().eq('id', entryId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['entries'] });
      toast.success('已删除');
    },
  });
}

export function useUpdateEntry() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, title, content }: { id: string; title: string; content: string }) => {
      const { error } = await supabase
        .from('entries')
        .update({ title, content })
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['entries'] });
      toast.success('已更新');
    },
  });
}

export function useApproveEntry() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (entryId: string) => {
      const { error } = await supabase.from('entries').update({ status: 'approved' as const }).eq('id', entryId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['entries'] });
      queryClient.invalidateQueries({ queryKey: ['pending_entries'] });
      toast.success('已批准');
    },
  });
}

export function useUpdateAutoMerge() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ adminId, enabled }: { adminId: string; enabled: boolean }) => {
      const { error } = await supabase
        .from('category_admins')
        .update({ auto_merge_enabled: enabled })
        .eq('id', adminId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['category_admins'] });
      toast.success('设置已更新');
    },
  });
}

/** Get all category IDs where the current user is admin */
export function useMyAdminCategoryIds() {
  const authorToken = getAuthorToken();
  return useQuery({
    queryKey: ['my_admin_categories', authorToken],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('category_admins')
        .select('category_id')
        .eq('admin_token', authorToken);
      if (error) throw error;
      return new Set(data.map(d => d.category_id));
    },
  });
}
