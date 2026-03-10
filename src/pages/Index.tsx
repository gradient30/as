import { useState, useMemo } from 'react';
import { useEntries, useCategories, useMyAdminCategoryIds, useDeleteEntry } from '@/hooks/useEntries';
import { useAuth, useIsAdmin } from '@/hooks/useAuth';
import { EntryCard } from '@/components/EntryCard';
import { EntryDetail } from '@/components/EntryDetail';
import { SubmitDialog } from '@/components/SubmitDialog';
import { EditDialog } from '@/components/EditDialog';
import { AdminPanel } from '@/components/AdminPanel';
import { AuthDialog } from '@/components/AuthDialog';
import { CategoryManager } from '@/components/CategoryManager';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import { Plus, BookOpen, Search, Settings, Eye, Moon, Sun, LogIn, LogOut, Tags } from 'lucide-react';
import { getAuthorToken } from '@/lib/author-token';
import type { EntryWithCategory } from '@/hooks/useEntries';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';

const useDarkMode = () => {
  const [dark, setDark] = useState(() => document.documentElement.classList.contains('dark'));
  const toggle = () => {
    const next = !dark;
    setDark(next);
    document.documentElement.classList.toggle('dark', next);
    localStorage.setItem('theme', next ? 'dark' : 'light');
  };
  return { dark, toggle };
};

const Index = () => {
  const [submitOpen, setSubmitOpen] = useState(false);
  const [selectedEntry, setSelectedEntry] = useState<EntryWithCategory | null>(null);
  const [detailOpen, setDetailOpen] = useState(false);
  const [editEntry, setEditEntry] = useState<EntryWithCategory | null>(null);
  const [editOpen, setEditOpen] = useState(false);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);
  const [categoryFilter, setCategoryFilter] = useState<string | undefined>();
  const [searchQuery, setSearchQuery] = useState('');
  const [manageMode, setManageMode] = useState(false);
  const [authOpen, setAuthOpen] = useState(false);
  const [categoryManagerOpen, setCategoryManagerOpen] = useState(false);

  const { user, signOut } = useAuth();
  const isGlobalAdmin = useIsAdmin();
  const { data: entries, isLoading: entriesLoading } = useEntries(categoryFilter);
  const { data: categories } = useCategories();
  const { data: adminCategoryIds } = useMyAdminCategoryIds();
  const deleteEntry = useDeleteEntry();
  const authorToken = getAuthorToken();
  const { dark, toggle: toggleDark } = useDarkMode();

  const hasAdminRights = isGlobalAdmin || (adminCategoryIds && adminCategoryIds.size > 0);

  // Check if user can manage a specific entry
  const canManageEntry = (entry: EntryWithCategory) => {
    if (isGlobalAdmin) return true;
    if (entry.author_token === authorToken) return true;
    if (entry.category_id && adminCategoryIds?.has(entry.category_id)) return true;
    return false;
  };

  // Filter entries by search query
  const filteredEntries = useMemo(() => {
    if (!entries || !searchQuery.trim()) return entries;
    const q = searchQuery.toLowerCase();
    return entries.filter(
      (e) => e.title.toLowerCase().includes(q) || e.content.toLowerCase().includes(q)
    );
  }, [entries, searchQuery]);

  // Find categories where current user is admin
  const adminCategories = categories?.filter(c => c.created_by_token === authorToken) || [];

  const handleEdit = (entry: EntryWithCategory) => {
    setEditEntry(entry);
    setEditOpen(true);
    setDetailOpen(false);
  };

  const handleDelete = (entryId: string) => {
    setDeleteConfirmId(entryId);
  };

  const confirmDelete = () => {
    if (deleteConfirmId) {
      deleteEntry.mutate(deleteConfirmId);
      setDeleteConfirmId(null);
    }
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="sticky top-0 z-40 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="container mx-auto flex h-14 items-center justify-between px-4">
          <div className="flex items-center gap-2">
            <BookOpen className="h-5 w-5 text-primary" />
            <h1 className="text-lg font-bold tracking-tight">知识库</h1>
          </div>
          <div className="flex items-center gap-2">
            <Button size="icon" variant="ghost" onClick={toggleDark} className="h-9 w-9">
              {dark ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
            </Button>
            {user ? (
              <>
                <span className="text-xs text-muted-foreground hidden sm:inline truncate max-w-[120px]">
                  {user.email}
                </span>
                {hasAdminRights && (
                  <>
                    <Button
                      size="sm"
                      variant={manageMode ? 'default' : 'outline'}
                      onClick={() => setManageMode(!manageMode)}
                    >
                      {manageMode ? <Eye className="h-4 w-4" /> : <Settings className="h-4 w-4" />}
                      {manageMode ? '浏览模式' : '管理模式'}
                    </Button>
                    <Button
                      size="icon"
                      variant="ghost"
                      className="h-9 w-9"
                      onClick={() => setCategoryManagerOpen(true)}
                      title="分类管理"
                    >
                      <Tags className="h-4 w-4" />
                    </Button>
                  </>
                )}
                <Button size="icon" variant="ghost" onClick={signOut} className="h-9 w-9" title="退出登录">
                  <LogOut className="h-4 w-4" />
                </Button>
              </>
            ) : (
              <Button size="sm" variant="outline" onClick={() => setAuthOpen(true)}>
                <LogIn className="h-4 w-4" />
                登录
              </Button>
            )}
            <Button size="sm" onClick={() => setSubmitOpen(true)}>
              <Plus className="h-4 w-4" />
              录入知识
            </Button>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-6 space-y-6">
        {/* Manage mode banner */}
        {manageMode && (
          <div className="rounded-lg border border-primary/30 bg-primary/5 px-4 py-3 text-sm text-primary flex items-center gap-2">
            <Settings className="h-4 w-4" />
            管理模式已开启 — 悬停卡片可编辑或删除条目，点击详情也可操作
          </div>
        )}

        {/* Search */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="搜索知识..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9"
          />
        </div>

        {/* Category filters */}
        {categories && categories.length > 0 && (
          <div className="flex flex-wrap gap-2">
            <Badge
              variant={!categoryFilter ? 'default' : 'outline'}
              className="cursor-pointer"
              onClick={() => setCategoryFilter(undefined)}
            >
              全部
            </Badge>
            {categories.map((cat) => (
              <Badge
                key={cat.id}
                variant={categoryFilter === cat.id ? 'default' : 'outline'}
                className="cursor-pointer"
                onClick={() => setCategoryFilter(cat.id)}
              >
                {cat.name}
              </Badge>
            ))}
          </div>
        )}

        {/* Admin panels for managed categories */}
        {manageMode && categoryFilter && adminCategories.some(c => c.id === categoryFilter) && (
          <AdminPanel
            categoryId={categoryFilter}
            categoryName={adminCategories.find(c => c.id === categoryFilter)?.name || ''}
          />
        )}

        {/* Entry grid */}
        {entriesLoading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {Array.from({ length: 6 }).map((_, i) => (
              <Skeleton key={i} className="h-44 rounded-lg" />
            ))}
          </div>
        ) : filteredEntries && filteredEntries.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredEntries.map((entry) => (
              <EntryCard
                key={entry.id}
                entry={entry}
                isManageMode={manageMode}
                canManage={canManageEntry(entry)}
                onEdit={() => handleEdit(entry)}
                onDelete={() => handleDelete(entry.id)}
                onClick={() => {
                  setSelectedEntry(entry);
                  setDetailOpen(true);
                }}
              />
            ))}
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <BookOpen className="h-12 w-12 text-muted-foreground/40 mb-4" />
            <h2 className="text-lg font-medium text-muted-foreground mb-1">暂无知识条目</h2>
            <p className="text-sm text-muted-foreground/70 mb-4">成为第一个录入知识的人吧！</p>
            <Button onClick={() => setSubmitOpen(true)}>
              <Plus className="h-4 w-4" />
              录入知识
            </Button>
          </div>
        )}
      </main>

      {/* Dialogs */}
      <SubmitDialog open={submitOpen} onOpenChange={setSubmitOpen} />
      <EntryDetail
        entry={selectedEntry}
        open={detailOpen}
        onOpenChange={setDetailOpen}
        canManage={selectedEntry ? canManageEntry(selectedEntry) : false}
        onEdit={() => selectedEntry && handleEdit(selectedEntry)}
        onDelete={() => selectedEntry && handleDelete(selectedEntry.id)}
      />
      <EditDialog entry={editEntry} open={editOpen} onOpenChange={setEditOpen} />
      <AuthDialog open={authOpen} onOpenChange={setAuthOpen} />

      {/* Delete confirmation */}
      <AlertDialog open={!!deleteConfirmId} onOpenChange={(open) => !open && setDeleteConfirmId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>确认删除</AlertDialogTitle>
            <AlertDialogDescription>此操作不可撤销，确定要删除这条知识吗？</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>取消</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDelete}>确认删除</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default Index;
