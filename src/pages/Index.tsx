import { useState, useMemo } from 'react';
import { useEntries, useVisibleCategories, useMyAdminCategoryIds, useDeleteEntry, useToggleEntryVisibility } from '@/hooks/useEntries';
import type { CategoryRow } from '@/hooks/useEntries';
import { useAuth, useIsAdmin } from '@/hooks/useAuth';
import { useLayoutStyle } from '@/hooks/useLayoutStyle';
import { EntryCard } from '@/components/EntryCard';
import { EntryDetail } from '@/components/EntryDetail';
import { SubmitDialog } from '@/components/SubmitDialog';
import { EditDialog } from '@/components/EditDialog';
import { AdminPanel } from '@/components/AdminPanel';
import { AuthDialog } from '@/components/AuthDialog';
import { CategoryManager } from '@/components/CategoryManager';
import { StyleSwitcher } from '@/components/StyleSwitcher';
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
  const { style, setStyle } = useLayoutStyle();
  const { data: entries, isLoading: entriesLoading } = useEntries(categoryFilter, { showAll: isGlobalAdmin });
  const { data: categories } = useVisibleCategories();
  const { data: adminCategoryIds } = useMyAdminCategoryIds();
  const deleteEntry = useDeleteEntry();
  const toggleVisibility = useToggleEntryVisibility();
  const authorToken = getAuthorToken();
  const { dark, toggle: toggleDark } = useDarkMode();

  const hasAdminRights = isGlobalAdmin || (adminCategoryIds && adminCategoryIds.size > 0);

  const canManageEntry = (entry: EntryWithCategory) => {
    if (isGlobalAdmin) return true;
    if (entry.author_token === authorToken) return true;
    if (user && entry.user_id === user.id) return true;
    if (entry.category_id && adminCategoryIds?.has(entry.category_id)) return true;
    return false;
  };

  const isOwnEntry = (entry: EntryWithCategory) => {
    if (entry.author_token === authorToken) return true;
    if (user && entry.user_id === user.id) return true;
    return false;
  };

  const filteredEntries = useMemo(() => {
    if (!entries || !searchQuery.trim()) return entries;
    const q = searchQuery.toLowerCase();
    return entries.filter(
      (e) => e.title.toLowerCase().includes(q) || e.content.toLowerCase().includes(q)
    );
  }, [entries, searchQuery]);

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

  const entryCount = filteredEntries?.length || 0;
  const todayCount = filteredEntries?.filter(e => {
    const d = new Date(e.created_at);
    const now = new Date();
    return d.toDateString() === now.toDateString();
  }).length || 0;
  const myCount = filteredEntries?.filter(e => isOwnEntry(e)).length || 0;

  // Background classes per style
  const bgClass = style === 'bento-glass'
    ? 'min-h-screen bg-gradient-to-br from-cyan-500/15 via-blue-500/10 to-teal-400/5 dark:from-cyan-900/30 dark:via-blue-950/20 dark:to-background'
    : style === 'dark-editorial'
    ? 'min-h-screen bg-background'
    : 'min-h-screen bg-[hsl(40,30%,95%)] dark:bg-background';

  return (
    <div className={bgClass}>
      {/* Style Switcher Bar */}
      <div className="border-b border-border/50 bg-background/80 backdrop-blur-sm">
        <div className="container mx-auto flex items-center justify-between px-4 py-2">
          <StyleSwitcher current={style} onChange={setStyle} />
          <div className="flex items-center gap-2">
            <Button size="icon" variant="ghost" onClick={toggleDark} className="h-8 w-8">
              {dark ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
            </Button>
          </div>
        </div>
      </div>

      {/* Header — varies by style */}
      {style === 'bento-glass' && (
        <header className="container mx-auto px-4 pt-8 pb-4">
          <p className="text-xs uppercase tracking-[0.3em] text-muted-foreground mb-1">知 识 库</p>
          <div className="flex items-end justify-between">
            <h1 className="text-4xl md:text-5xl font-black tracking-tight">My Brain</h1>
            <div className="flex items-center gap-3">
              <Badge variant="secondary" className="text-sm px-3 py-1">{entryCount} 条笔记</Badge>
              <HeaderActions user={user} hasAdminRights={hasAdminRights} manageMode={manageMode}
                setManageMode={setManageMode} signOut={signOut} setAuthOpen={setAuthOpen}
                setSubmitOpen={setSubmitOpen} setCategoryManagerOpen={setCategoryManagerOpen} />
            </div>
          </div>
        </header>
      )}

      {style === 'dark-editorial' && (
        <header className="container mx-auto px-4 pt-6 pb-6">
          <nav className="flex items-center justify-between mb-8">
            <div className="flex items-center gap-6">
              <h1 className="text-lg font-black uppercase tracking-widest">Knowledge</h1>
              <span className="text-sm text-muted-foreground hidden sm:inline">发现</span>
              <span className="text-sm text-muted-foreground hidden sm:inline">我的</span>
            </div>
            <div className="flex items-center gap-3">
              <span className="text-sm text-muted-foreground hidden sm:inline">
                {new Date().toLocaleDateString('zh-CN', { year: 'numeric', month: '2-digit', day: '2-digit' }).replace(/\//g, ' · ')}
              </span>
              <HeaderActions user={user} hasAdminRights={hasAdminRights} manageMode={manageMode}
                setManageMode={setManageMode} signOut={signOut} setAuthOpen={setAuthOpen}
                setSubmitOpen={setSubmitOpen} setCategoryManagerOpen={setCategoryManagerOpen} />
            </div>
          </nav>
          <div className="flex items-end justify-between">
            <div>
              <p className="text-xs uppercase tracking-[0.3em] text-primary mb-2">个 人 知 识 库</p>
              <h2 className="text-5xl md:text-7xl font-black uppercase leading-none tracking-tighter">
                <span className="block">MY</span>
                <span className="block text-muted-foreground/30">BRAIN</span>
              </h2>
            </div>
            <div className="flex gap-6 items-end">
              {[
                { n: entryCount, label: '笔记总数' },
                { n: todayCount, label: '今日更新' },
                { n: myCount, label: '我的' },
              ].map(s => (
                <div key={s.label} className="text-center">
                  <p className="text-3xl font-black text-primary">{s.n}</p>
                  <p className="text-[10px] text-muted-foreground">{s.label}</p>
                </div>
              ))}
            </div>
          </div>
        </header>
      )}

      {style === 'neubrutalism' && (
        <header className="container mx-auto px-4 pt-6 pb-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <span className="text-3xl">🧠</span>
              <div>
                <h1 className="text-2xl font-black uppercase tracking-wider">Knowledge</h1>
                <p className="text-xs text-muted-foreground">个人知识库 · v2.0</p>
              </div>
            </div>
            <HeaderActions user={user} hasAdminRights={hasAdminRights} manageMode={manageMode}
              setManageMode={setManageMode} signOut={signOut} setAuthOpen={setAuthOpen}
              setSubmitOpen={setSubmitOpen} setCategoryManagerOpen={setCategoryManagerOpen}
              neuStyle />
          </div>
        </header>
      )}

      <main className="container mx-auto px-4 py-4 space-y-5">
        {/* Manage mode banner */}
        {manageMode && (
          <div className="rounded-lg border border-primary/30 bg-primary/5 px-4 py-3 text-sm text-primary flex items-center gap-2">
            <Settings className="h-4 w-4" />
            管理模式已开启
          </div>
        )}

        {/* Search */}
        <div className={`relative ${style === 'neubrutalism' ? 'border-2 border-foreground/80 rounded-xl overflow-hidden' : ''}`}>
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="搜索知识..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className={`pl-9 ${style === 'neubrutalism' ? 'border-0 h-12 text-base' : ''}`}
          />
        </div>

        {/* Category filters */}
        <CategoryFilters
          categories={categories}
          categoryFilter={categoryFilter}
          setCategoryFilter={setCategoryFilter}
          style={style}
        />

        {/* Admin panels */}
        {manageMode && categoryFilter && adminCategories.some(c => c.id === categoryFilter) && (
          <AdminPanel
            categoryId={categoryFilter}
            categoryName={adminCategories.find(c => c.id === categoryFilter)?.name || ''}
          />
        )}

        {/* Editorial table header */}
        {style === 'dark-editorial' && filteredEntries && filteredEntries.length > 0 && (
          <div className="grid grid-cols-[40px_1fr_auto_auto_auto] items-center gap-4 px-2 text-[11px] uppercase tracking-wider text-muted-foreground border-b border-border/50 pb-2">
            <span>#</span>
            <span>标题 / 内容</span>
            <span className="hidden md:block">标签</span>
            <span className="hidden lg:block">分类</span>
            <span className="text-right">时间</span>
          </div>
        )}

        {/* Entry grid/list */}
        {entriesLoading ? (
          <SkeletonLoader style={style} />
        ) : filteredEntries && filteredEntries.length > 0 ? (
          <div className={
            style === 'dark-editorial'
              ? 'divide-y-0'
              : style === 'bento-glass'
              ? 'grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 auto-rows-auto'
              : 'grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5'
          }>
            {filteredEntries.map((entry, i) => (
              <EntryCard
                key={entry.id}
                entry={entry}
                isManageMode={manageMode}
                canManage={canManageEntry(entry)}
                isOwn={isOwnEntry(entry)}
                onEdit={() => handleEdit(entry)}
                onDelete={() => handleDelete(entry.id)}
                onToggleVisibility={() => toggleVisibility.mutate({ id: entry.id, is_private: !entry.is_private })}
                onClick={() => { setSelectedEntry(entry); setDetailOpen(true); }}
                layoutStyle={style}
                index={i}
              />
            ))}
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <BookOpen className="h-12 w-12 text-muted-foreground/40 mb-4" />
            <h2 className="text-lg font-medium text-muted-foreground mb-1">暂无知识条目</h2>
            <p className="text-sm text-muted-foreground/70 mb-4">成为第一个录入知识的人吧！</p>
            <Button onClick={() => setSubmitOpen(true)}>
              <Plus className="h-4 w-4" />录入知识
            </Button>
          </div>
        )}
      </main>

      {/* Dialogs */}
      <SubmitDialog open={submitOpen} onOpenChange={setSubmitOpen} />
      <EntryDetail entry={selectedEntry} open={detailOpen} onOpenChange={setDetailOpen}
        canManage={selectedEntry ? canManageEntry(selectedEntry) : false}
        onEdit={() => selectedEntry && handleEdit(selectedEntry)}
        onDelete={() => selectedEntry && handleDelete(selectedEntry.id)} />
      <EditDialog entry={editEntry} open={editOpen} onOpenChange={setEditOpen} />
      <AuthDialog open={authOpen} onOpenChange={setAuthOpen} />
      <CategoryManager open={categoryManagerOpen} onOpenChange={setCategoryManagerOpen} />

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

// ===== Sub-components =====

function HeaderActions({ user, hasAdminRights, manageMode, setManageMode, signOut, setAuthOpen, setSubmitOpen, setCategoryManagerOpen, neuStyle }: any) {
  return (
    <div className="flex items-center gap-2">
      {user ? (
        <>
          <span className="text-xs text-muted-foreground hidden sm:inline truncate max-w-[100px]">
            {user.email}
          </span>
          {hasAdminRights && (
            <>
              <Button size="sm" variant={manageMode ? 'default' : 'outline'} onClick={() => setManageMode(!manageMode)} className="hidden sm:flex">
                {manageMode ? <Eye className="h-4 w-4" /> : <Settings className="h-4 w-4" />}
                {manageMode ? '浏览' : '管理'}
              </Button>
              <Button size="icon" variant="ghost" className="h-8 w-8" onClick={() => setCategoryManagerOpen(true)} title="分类管理">
                <Tags className="h-4 w-4" />
              </Button>
            </>
          )}
          <Button size="icon" variant="ghost" onClick={signOut} className="h-8 w-8" title="退出登录">
            <LogOut className="h-4 w-4" />
          </Button>
        </>
      ) : (
        <Button size="sm" variant="outline" onClick={() => setAuthOpen(true)}>
          <LogIn className="h-4 w-4" />登录
        </Button>
      )}
      <Button
        size="sm"
        onClick={() => setSubmitOpen(true)}
        className={neuStyle ? 'border-2 border-foreground/80 bg-background text-foreground hover:bg-foreground hover:text-background font-bold' : ''}
      >
        <Plus className="h-4 w-4" />
        {neuStyle ? '新建笔记' : '录入知识'}
      </Button>
    </div>
  );
}

function CategoryFilters({ categories, categoryFilter, setCategoryFilter, style }: {
  categories: CategoryRow[] | undefined;
  categoryFilter: string | undefined;
  setCategoryFilter: (id: string | undefined) => void;
  style: string;
}) {
  if (!categories || categories.length === 0) return null;

  const l1Cats = categories.filter((c: CategoryRow) => !c.parent_id && c.is_system);
  const getChildren = (pid: string) => categories.filter((c: CategoryRow) => c.parent_id === pid);

  if (style === 'dark-editorial') {
    return (
      <div className="flex flex-wrap gap-4 border-b border-border/30 pb-3">
        <button
          className={`text-sm transition-colors ${!categoryFilter ? 'text-primary font-bold border-b-2 border-primary pb-1' : 'text-muted-foreground hover:text-foreground'}`}
          onClick={() => setCategoryFilter(undefined)}
        >
          全部
        </button>
        {l1Cats.map((cat: CategoryRow) => (
          <button
            key={cat.id}
            className={`text-sm transition-colors ${categoryFilter === cat.id ? 'text-primary font-bold border-b-2 border-primary pb-1' : 'text-muted-foreground hover:text-foreground'}`}
            onClick={() => setCategoryFilter(cat.id)}
          >
            {cat.name}
          </button>
        ))}
      </div>
    );
  }

  if (style === 'neubrutalism') {
    return (
      <div className="flex flex-wrap gap-2">
        <button
          className={`px-4 py-2 text-sm rounded-lg border-2 transition-all ${
            !categoryFilter
              ? 'border-foreground/80 bg-foreground text-background font-bold'
              : 'border-foreground/30 bg-background hover:border-foreground/60'
          }`}
          onClick={() => setCategoryFilter(undefined)}
        >
          全部
        </button>
        {l1Cats.map((cat: CategoryRow) => (
          <button
            key={cat.id}
            className={`px-4 py-2 text-sm rounded-lg border-2 transition-all ${
              categoryFilter === cat.id
                ? 'border-foreground/80 bg-foreground text-background font-bold'
                : 'border-foreground/30 bg-background hover:border-foreground/60'
            }`}
            onClick={() => setCategoryFilter(cat.id)}
          >
            {cat.name}
          </button>
        ))}
      </div>
    );
  }

  // Bento Glass (default)
  return (
    <div className="space-y-2">
      <div className="flex flex-wrap gap-2">
        <Badge
          variant={!categoryFilter ? 'default' : 'outline'}
          className="cursor-pointer backdrop-blur bg-white/20 dark:bg-white/10 border-white/30"
          onClick={() => setCategoryFilter(undefined)}
        >
          全部
        </Badge>
        {l1Cats.map((cat: CategoryRow) => (
          <Badge
            key={cat.id}
            variant={categoryFilter === cat.id ? 'default' : 'outline'}
            className="cursor-pointer backdrop-blur bg-white/20 dark:bg-white/10 border-white/30"
            onClick={() => setCategoryFilter(cat.id)}
          >
            {cat.name}
          </Badge>
        ))}
      </div>
      {categoryFilter && l1Cats.some((c: CategoryRow) => c.id === categoryFilter) && (
        <div className="flex flex-wrap gap-2 pl-4">
          {getChildren(categoryFilter).map((sub: CategoryRow) => (
            <Badge
              key={sub.id}
              variant={categoryFilter === sub.id ? 'default' : 'outline'}
              className="cursor-pointer text-xs"
              onClick={() => setCategoryFilter(sub.id)}
            >
              {sub.name}
              {!sub.is_approved && <span className="ml-1 opacity-60">（待审核）</span>}
            </Badge>
          ))}
        </div>
      )}
    </div>
  );
}

function SkeletonLoader({ style }: { style: string }) {
  if (style === 'dark-editorial') {
    return (
      <div className="space-y-0">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="grid grid-cols-[40px_1fr_auto_auto] items-center gap-4 py-4 px-2 border-b border-border/30 animate-fade-in" style={{ animationDelay: `${i * 80}ms`, animationFillMode: 'both' }}>
            <Skeleton className="h-8 w-8 rounded" />
            <div className="space-y-2">
              <Skeleton className="h-4 w-3/4" />
              <Skeleton className="h-3 w-1/2" />
            </div>
            <Skeleton className="h-5 w-16 rounded hidden md:block" />
            <Skeleton className="h-3 w-20" />
          </div>
        ))}
      </div>
    );
  }

  if (style === 'neubrutalism') {
    return (
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
        {Array.from({ length: 6 }).map((_, i) => (
          <div
            key={i}
            className="rounded-xl border-2 border-foreground/20 p-5 space-y-3 animate-fade-in"
            style={{
              animationDelay: `${i * 100}ms`,
              animationFillMode: 'both',
              backgroundColor: `hsl(${[50, 160, 270, 350, 200, 30][i % 6]} ${i % 2 === 0 ? '60%' : '70%'} 90% / 0.4)`,
            }}
          >
            <Skeleton className="h-10 w-10 rounded-lg" />
            <Skeleton className="h-5 w-24 rounded-sm" />
            <Skeleton className="h-6 w-3/4" />
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-2/3" />
            <div className="border-t border-foreground/10 pt-3 flex justify-between">
              <Skeleton className="h-3 w-28" />
              <Skeleton className="h-7 w-7 rounded-md" />
            </div>
          </div>
        ))}
      </div>
    );
  }

  // Bento Glass
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 auto-rows-auto">
      {Array.from({ length: 6 }).map((_, i) => (
        <div
          key={i}
          className={`rounded-2xl p-5 space-y-3 backdrop-blur-xl bg-gradient-to-br from-white/15 to-white/5 dark:from-white/8 dark:to-white/[0.02] border border-white/15 animate-fade-in ${i === 0 ? 'md:col-span-2 md:row-span-2' : ''}`}
          style={{ animationDelay: `${i * 100}ms`, animationFillMode: 'both' }}
        >
          <Skeleton className="h-10 w-10 rounded-full bg-white/10" />
          <Skeleton className={`h-5 w-24 rounded bg-white/10`} />
          <Skeleton className={`${i === 0 ? 'h-8' : 'h-6'} w-3/4 bg-white/10`} />
          <Skeleton className="h-4 w-full bg-white/10" />
          {i === 0 && <Skeleton className="h-4 w-2/3 bg-white/10" />}
          <Skeleton className="h-3 w-32 bg-white/10 mt-auto" />
        </div>
      ))}
    </div>
  );
}

export default Index;
