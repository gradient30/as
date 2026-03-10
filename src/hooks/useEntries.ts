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

export type CategoryRow = {
  id: string;
  name: string;
  slug: string;
  keywords: string[];
  parent_id: string | null;
  is_system: boolean;
  is_approved: boolean;
  created_by_token: string;
  created_by_user_id: string | null;
  created_at: string;
};

// Smart category IDs (hardcoded for performance)
export const SMART_CATEGORY_IDS = {
  FREQUENTLY_VIEWED: '1c701e75-4f1e-4d7b-9865-bb4d62684eef', // 经常看
  IGNORED: '526caa35-fd37-47a3-8c58-295184aa7433', // 没人理
};

export type EntryWithCategory = {
  id: string;
  title: string;
  content: string;
  category_id: string | null;
  author_token: string;
  user_id: string | null;
  status: 'approved' | 'pending' | 'merged';
  contributors: string[];
  created_at: string;
  updated_at: string;
  is_private: boolean;
  share_token: string | null;
  view_count: number;
  last_viewed_at: string | null;
  categories: { id: string; name: string; slug: string } | null;
};

function generateShareToken(): string {
  return crypto.randomUUID().replace(/-/g, '').slice(0, 16);
}

async function getCurrentUserId(): Promise<string | null> {
  const { data } = await supabase.auth.getSession();
  return data.session?.user?.id ?? null;
}

export function useEntries(categoryFilter?: string, options?: { showAll?: boolean }) {
  const authorToken = getAuthorToken();

  return useQuery({
    queryKey: ['entries', categoryFilter, options?.showAll],
    queryFn: async () => {
      let query = supabase
        .from('entries')
        .select('*, categories(id, name, slug)')
        .eq('status', 'approved')
        .order('created_at', { ascending: false });

      if (categoryFilter) {
        // Could be L1 or L2 category. If L1, also include entries from child categories
        const { data: childCats } = await supabase
          .from('categories')
          .select('id')
          .eq('parent_id', categoryFilter);
        
        const childIds = childCats?.map(c => c.id) || [];
        const allIds = [categoryFilter, ...childIds];
        query = query.in('category_id', allIds);
      }

      const { data, error } = await query;
      if (error) throw error;

      const entries = data as unknown as EntryWithCategory[];

      if (options?.showAll) return entries;

      const userId = await getCurrentUserId();
      return entries.filter(
        (e) => !e.is_private || e.author_token === authorToken || (userId && e.user_id === userId)
      );
    },
  });
}

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

      if (entry.is_private) {
        const userId = await getCurrentUserId();
        const isOwner = entry.author_token === authorToken || (userId && entry.user_id === userId);
        if (!isOwner && entry.share_token !== shareToken) {
          if (userId) {
            const { data: roleData } = await supabase.rpc('has_role', { _user_id: userId, _role: 'admin' });
            if (!roleData) throw new Error('无权访问该知识');
          } else {
            throw new Error('无权访问该知识');
          }
        }
      }

      return entry;
    },
  });
}

/** Fetch all categories (hierarchical) */
export function useCategories() {
  return useQuery({
    queryKey: ['categories'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('categories')
        .select('*')
        .order('created_at', { ascending: true });
      if (error) throw error;
      return data as unknown as CategoryRow[];
    },
  });
}

/** Only approved + system categories visible to regular users */
export function useVisibleCategories() {
  const authorToken = getAuthorToken();
  return useQuery({
    queryKey: ['categories', 'visible', authorToken],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('categories')
        .select('*')
        .order('created_at', { ascending: true });
      if (error) throw error;
      const all = data as unknown as CategoryRow[];
      // Show: system categories, approved categories, or own unapproved categories
      return all.filter(c => c.is_system || c.is_approved || c.created_by_token === authorToken);
    },
  });
}

/** Pending (unapproved) L2 categories for admin review */
export function usePendingCategories() {
  return useQuery({
    queryKey: ['categories', 'pending'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('categories')
        .select('*')
        .eq('is_approved', false)
        .eq('is_system', false)
        .order('created_at', { ascending: true });
      if (error) throw error;
      return data as unknown as CategoryRow[];
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
    mutationFn: async ({ title, content, is_private = false, category_id }: { 
      title: string; content: string; is_private?: boolean; category_id?: string 
    }) => {
      const authorToken = getAuthorToken();
      const userId = await getCurrentUserId();
      const keywords = extractKeywords(title + ' ' + content);
      const shareToken = is_private ? generateShareToken() : null;

      let categoryId: string | undefined = category_id;

      // If no category selected, try auto-categorization
      if (!categoryId) {
        const { data: categories } = await supabase
          .from('categories')
          .select('id, name, keywords, slug');

        const existingCategories = categories || [];
        const bestCategory = findBestCategory(keywords, existingCategories);

        if (bestCategory) {
          categoryId = bestCategory.categoryId;
          const existingCat = existingCategories.find(c => c.id === categoryId);
          if (existingCat) {
            const mergedKeywords = [...new Set([...existingCat.keywords, ...keywords])];
            await supabase
              .from('categories')
              .update({ keywords: mergedKeywords })
              .eq('id', categoryId);
          }
        } else {
          // Create new L2 category under best-matching L1, pending approval
          const { data: l1Cats } = await supabase
            .from('categories')
            .select('id, name, keywords')
            .eq('is_system', true);
          
          let parentId: string | undefined;
          if (l1Cats && l1Cats.length > 0) {
            const bestL1 = findBestCategory(keywords, l1Cats);
            if (bestL1) parentId = bestL1.categoryId;
          }

          const catName = generateCategoryName(keywords);
          const slug = generateSlug(catName) + '-' + Date.now();

          const { data: newCat, error: catError } = await supabase
            .from('categories')
            .insert({ 
              name: catName, 
              slug, 
              keywords, 
              created_by_token: authorToken, 
              created_by_user_id: userId,
              parent_id: parentId || null,
              is_system: false,
              is_approved: false, // Needs admin approval
            })
            .select()
            .single();

          if (catError) throw catError;
          categoryId = newCat.id;

          await supabase.from('category_admins').insert({
            category_id: categoryId,
            admin_token: authorToken,
            is_founder: true,
            auto_merge_enabled: true,
            user_id: userId,
          });
        }
      }

      // Private entries skip similarity check
      if (is_private) {
        const { error } = await supabase.from('entries').insert({
          title,
          content,
          category_id: categoryId || null,
          author_token: authorToken,
          user_id: userId,
          status: 'approved' as const,
          contributors: [authorToken],
          is_private: true,
          share_token: shareToken,
        });
        if (error) throw error;
        toast.success('私密知识已成功录入！');
        return;
      }

      // Check similarity with existing entries
      if (categoryId) {
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
                  user_id: userId,
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

        if (!merged) {
          const { error } = await supabase.from('entries').insert({
            title,
            content,
            category_id: categoryId,
            author_token: authorToken,
            user_id: userId,
            status: 'approved' as const,
            contributors: [authorToken],
          });
          if (error) throw error;
          toast.success('知识已成功录入！');
        }
      } else {
        const { error } = await supabase.from('entries').insert({
          title,
          content,
          category_id: null,
          author_token: authorToken,
          user_id: userId,
          status: 'approved' as const,
          contributors: [authorToken],
        });
        if (error) throw error;
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

export function useToggleEntryVisibility() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, is_private }: { id: string; is_private: boolean }) => {
      const shareToken = is_private ? generateShareToken() : null;
      const { error } = await supabase
        .from('entries')
        .update({ is_private, share_token: shareToken })
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['entries'] });
      toast.success('可见性已更新');
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

export function useApproveCategory() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, name, parentId }: { id: string; name?: string; parentId?: string }) => {
      const updates: Record<string, unknown> = { is_approved: true };
      if (name) updates.name = name;
      if (parentId) updates.parent_id = parentId;
      const { error } = await supabase.from('categories').update(updates).eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['categories'] });
      toast.success('分类已审核通过');
    },
  });
}

export function useRejectCategory() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      // Move entries to uncategorized, then delete
      await supabase.from('entries').update({ category_id: null }).eq('category_id', id);
      await supabase.from('category_admins').delete().eq('category_id', id);
      const { error } = await supabase.from('categories').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['categories'] });
      queryClient.invalidateQueries({ queryKey: ['entries'] });
      toast.success('分类已拒绝并删除');
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

/** Check if a category ID is a smart/virtual category */
export function isSmartCategory(categoryId: string | undefined): boolean {
  if (!categoryId) return false;
  return categoryId === SMART_CATEGORY_IDS.FREQUENTLY_VIEWED || categoryId === SMART_CATEGORY_IDS.IGNORED;
}

/** Record a view for an entry */
export function useRecordView() {
  const queryClient = useQueryClient();
  const authorToken = getAuthorToken();

  return useMutation({
    mutationFn: async (entryId: string) => {
      const userId = await getCurrentUserId();

      // Insert view record
      await supabase.from('entry_views').insert({
        entry_id: entryId,
        viewer_token: authorToken,
        viewer_user_id: userId,
      });

      // Update entries counters
      // First get current count
      const { data: entry } = await supabase
        .from('entries')
        .select('view_count')
        .eq('id', entryId)
        .single();

      await supabase
        .from('entries')
        .update({
          view_count: (entry?.view_count || 0) + 1,
          last_viewed_at: new Date().toISOString(),
        })
        .eq('id', entryId);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['entries'] });
    },
  });
}

/** Fetch entries for smart categories (经常看 / 没人理) */
export function useSmartCategoryEntries(smartCategoryId: string | undefined) {
  const authorToken = getAuthorToken();

  return useQuery({
    queryKey: ['smart-entries', smartCategoryId],
    enabled: !!smartCategoryId && isSmartCategory(smartCategoryId),
    queryFn: async () => {
      if (smartCategoryId === SMART_CATEGORY_IDS.FREQUENTLY_VIEWED) {
        // 经常看: entries viewed >= 5 times in the last 7 days
        const oneWeekAgo = new Date();
        oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);

        const { data: viewCounts } = await supabase
          .from('entry_views')
          .select('entry_id')
          .gte('viewed_at', oneWeekAgo.toISOString());

        if (!viewCounts || viewCounts.length === 0) return [];

        // Count views per entry
        const counts = new Map<string, number>();
        for (const v of viewCounts) {
          counts.set(v.entry_id, (counts.get(v.entry_id) || 0) + 1);
        }

        // Filter entries with >= 5 views
        const hotIds = [...counts.entries()].filter(([, c]) => c >= 5).map(([id]) => id);
        if (hotIds.length === 0) return [];

        const { data, error } = await supabase
          .from('entries')
          .select('*, categories(id, name, slug)')
          .in('id', hotIds)
          .eq('status', 'approved')
          .order('created_at', { ascending: false });

        if (error) throw error;
        const entries = data as unknown as EntryWithCategory[];
        const userId = await getCurrentUserId();
        return entries.filter(
          (e) => !e.is_private || e.author_token === authorToken || (userId && e.user_id === userId)
        );

      } else if (smartCategoryId === SMART_CATEGORY_IDS.IGNORED) {
        // 没人理: entries with last_viewed_at > 30 days ago or never viewed
        const thirtyDaysAgo = new Date();
        thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

        const { data, error } = await supabase
          .from('entries')
          .select('*, categories(id, name, slug)')
          .eq('status', 'approved')
          .or(`last_viewed_at.is.null,last_viewed_at.lt.${thirtyDaysAgo.toISOString()}`)
          .order('created_at', { ascending: false });

        if (error) throw error;
        const entries = data as unknown as EntryWithCategory[];
        const userId = await getCurrentUserId();
        return entries.filter(
          (e) => !e.is_private || e.author_token === authorToken || (userId && e.user_id === userId)
        );
      }

      return [];
    },
  });
}
