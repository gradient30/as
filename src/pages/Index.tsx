import { useState, useMemo, useEffect } from 'react';
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
import { CyberLayout } from '@/components/CyberLayout';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import { Plus, BookOpen, Search, Settings, Eye, Moon, Sun, LogIn, LogOut, Tags, Wifi, Command } from 'lucide-react';
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
  const [selectedEntryIndex, setSelectedEntryIndex] = useState(0);
  const [detailOpen, setDetailOpen] = useState(false);
  const [editEntry, setEditEntry] = useState<EntryWithCategory | null>(null);
  const [editOpen, setEditOpen] = useState(false);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);
  const [categoryFilter, setCategoryFilter] = useState<string | undefined>();
  const [searchQuery, setSearchQuery] = useState('');
  const [manageMode, setManageMode] = useState(false);
  const [authOpen, setAuthOpen] = useState(false);
  const [categoryManagerOpen, setCategoryManagerOpen] = useState(false);
  const [viewMode, setViewMode] = useState<'discover' | 'mine'>('discover');

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
    let result = entries;
    if (!result) return result;
    // View mode filter
    if (viewMode === 'mine') {
      result = result.filter(e => isOwnEntry(e));
    }
    // Search filter
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      result = result.filter(
        (e) => e.title.toLowerCase().includes(q) || e.content.toLowerCase().includes(q)
      );
    }
    return result;
  }, [entries, searchQuery, viewMode, authorToken, user]);

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
  const totalCount = entries?.length || 0;
  const todayCount = entries?.filter(e => {
    const d = new Date(e.created_at);
    const now = new Date();
    return d.toDateString() === now.toDateString();
  }).length || 0;
  const myCount = entries?.filter(e => isOwnEntry(e)).length || 0;

  // Current time for cyberpunk display
  const [currentTime, setCurrentTime] = useState(() => new Date().toLocaleTimeString('en-US', { hour12: false }));
  useEffect(() => {
    const interval = setInterval(() => setCurrentTime(new Date().toLocaleTimeString('en-US', { hour12: false })), 1000);
    return () => clearInterval(interval);
  }, []);

  // Background classes per style
  const bgClass = style === 'bento-glass'
    ? 'min-h-screen bg-[hsl(var(--cyber-bg))]'
    : style === 'dark-editorial'
    ? 'min-h-screen bg-background'
    : 'min-h-screen bg-[hsl(40,30%,95%)] dark:bg-background';

  // For bento-glass, use the dedicated CyberLayout
  if (style === 'bento-glass') {
    const cyberHeaderActions = (
      <HeaderActions user={user} hasAdminRights={hasAdminRights} manageMode={manageMode}
        setManageMode={setManageMode} signOut={signOut} setAuthOpen={setAuthOpen}
        setSubmitOpen={setSubmitOpen} setCategoryManagerOpen={setCategoryManagerOpen} />
    );

    return (
      <div className={bgClass}>
        {/* Style Switcher Bar */}
        <div className="border-[hsl(var(--cyber-border))] bg-[hsl(var(--cyber-sidebar))] backdrop-blur-sm border-b">
          <div className="container mx-auto flex items-center justify-between px-4 py-2">
            <StyleSwitcher current={style} onChange={setStyle} />
            <div className="flex items-center gap-2">
              <Button size="icon" variant="ghost" onClick={toggleDark} className="h-8 w-8">
                {dark ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
              </Button>
            </div>
          </div>
        </div>

        <CyberLayout
          entries={filteredEntries}
          entriesLoading={entriesLoading}
          categories={categories}
          categoryFilter={categoryFilter}
          setCategoryFilter={setCategoryFilter}
          searchQuery={searchQuery}
          setSearchQuery={setSearchQuery}
          viewMode={viewMode}
          setViewMode={setViewMode}
          selectedEntry={selectedEntry}
          setSelectedEntry={setSelectedEntry}
          canManageEntry={canManageEntry}
          isOwnEntry={isOwnEntry}
          onEdit={handleEdit}
          onDelete={handleDelete}
          onSubmit={() => setSubmitOpen(true)}
          totalCount={totalCount}
          currentTime={currentTime}
          user={user}
          headerActions={cyberHeaderActions}
        />

        {/* Dialogs */}
        <SubmitDialog open={submitOpen} onOpenChange={setSubmitOpen} />
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
  }

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

      {style === 'dark-editorial' && (
        <header className="container mx-auto px-4 pt-6 pb-4">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-4">
              <img src={(await import('@/assets/logo-fish.png')).default} alt="openwz" className="h-7 w-7 object-contain" />
              <h1 className="text-lg font-black uppercase tracking-widest">openwz</h1>
              <ViewTabs viewMode={viewMode} setViewMode={setViewMode} variant="editorial" />
            </div>
            <div className="flex items-center gap-3">
              <span className="text-xs text-muted-foreground hidden sm:inline">
                {new Date().toLocaleDateString('zh-CN', { year: 'numeric', month: '2-digit', day: '2-digit' }).replace(/\//g, ' · ')}
              </span>
              <HeaderActions user={user} hasAdminRights={hasAdminRights} manageMode={manageMode}
                setManageMode={setManageMode} signOut={signOut} setAuthOpen={setAuthOpen}
                setSubmitOpen={setSubmitOpen} setCategoryManagerOpen={setCategoryManagerOpen} />
            </div>
          </div>
          <div className="flex gap-6">
            {[
              { n: entryCount, label: '笔记总数' },
              { n: todayCount, label: '今日更新' },
              { n: myCount, label: '我的' },
            ].map(s => (
              <div key={s.label} className="text-center">
                <p className="text-2xl font-black text-primary">{s.n}</p>
                <p className="text-[10px] text-muted-foreground">{s.label}</p>
              </div>
            ))}
          </div>
        </header>
      )}

      {style === 'neubrutalism' && (
        <header className="container mx-auto px-4 pt-6 pb-4">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-3">
              <span className="text-2xl">🧠</span>
              <div>
                <h1 className="text-xl font-black uppercase tracking-wider">Knowledge</h1>
                <p className="text-[10px] text-muted-foreground">个人知识库</p>
              </div>
            </div>
            <HeaderActions user={user} hasAdminRights={hasAdminRights} manageMode={manageMode}
              setManageMode={setManageMode} signOut={signOut} setAuthOpen={setAuthOpen}
              setSubmitOpen={setSubmitOpen} setCategoryManagerOpen={setCategoryManagerOpen}
              neuStyle />
          </div>
          <ViewTabs viewMode={viewMode} setViewMode={setViewMode} variant="neu" />
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

        {/* Entry grid */}
        {entriesLoading ? (
          <SkeletonLoader style={style} />
        ) : filteredEntries && filteredEntries.length > 0 ? (
          <div className={
            style === 'dark-editorial'
              ? 'grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4'
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
                onClick={() => { setSelectedEntry(entry); setSelectedEntryIndex(i); setDetailOpen(true); }}
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
        onDelete={() => selectedEntry && handleDelete(selectedEntry.id)}
        layoutStyle={style}
        cardIndex={selectedEntryIndex} />
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

function ViewTabs({ viewMode, setViewMode, variant }: {
  viewMode: 'discover' | 'mine';
  setViewMode: (v: 'discover' | 'mine') => void;
  variant: 'glass' | 'editorial' | 'neu';
}) {
  const tabs = [
    { key: 'discover' as const, label: '发现' },
    { key: 'mine' as const, label: '我的' },
  ];

  if (variant === 'editorial') {
    return (
      <div className="flex items-center gap-4">
        {tabs.map(t => (
          <button
            key={t.key}
            onClick={() => setViewMode(t.key)}
            className={`text-sm transition-colors ${viewMode === t.key ? 'text-foreground font-bold' : 'text-muted-foreground hover:text-foreground'}`}
          >
            {t.label}
          </button>
        ))}
      </div>
    );
  }

  if (variant === 'neu') {
    return (
      <div className="flex gap-2">
        {tabs.map(t => (
          <button
            key={t.key}
            onClick={() => setViewMode(t.key)}
            className={`px-4 py-1.5 text-sm rounded-lg border-2 transition-all font-bold ${
              viewMode === t.key
                ? 'border-foreground/80 bg-foreground text-background'
                : 'border-foreground/20 bg-background text-foreground hover:border-foreground/50'
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>
    );
  }

  // default (editorial)
  return (
    <div className="flex items-center gap-4">
      {tabs.map(t => (
        <button
          key={t.key}
          onClick={() => setViewMode(t.key)}
          className={`text-sm transition-colors ${viewMode === t.key ? 'text-foreground font-bold' : 'text-muted-foreground hover:text-foreground'}`}
        >
          {t.label}
        </button>
      ))}
    </div>
  );
}

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

  // default fallback
  return null;
}

function SkeletonLoader({ style }: { style: string }) {
  if (style === 'dark-editorial') {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="rounded-lg border border-border/30 p-4 space-y-3 animate-pulse">
            <div className="flex gap-2">
              <Skeleton className="h-5 w-12" />
              <Skeleton className="h-5 w-16" />
            </div>
            <Skeleton className="h-5 w-3/4" />
            <Skeleton className="h-4 w-full" />
            <div className="flex justify-between">
              <Skeleton className="h-3 w-24" />
              <Skeleton className="h-8 w-8" />
            </div>
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
            className="rounded-xl border-2 border-foreground/20 p-5 space-y-3 animate-pulse"
            style={{
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

  // default
  return null;
}

export default Index;
