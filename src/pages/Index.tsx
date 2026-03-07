import { useState, useMemo } from 'react';
import { useEntries, useCategories } from '@/hooks/useEntries';
import { EntryCard } from '@/components/EntryCard';
import { EntryDetail } from '@/components/EntryDetail';
import { SubmitDialog } from '@/components/SubmitDialog';
import { AdminPanel } from '@/components/AdminPanel';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import { Plus, BookOpen, Search } from 'lucide-react';
import { getAuthorToken } from '@/lib/author-token';
import type { EntryWithCategory } from '@/hooks/useEntries';

const Index = () => {
  const [submitOpen, setSubmitOpen] = useState(false);
  const [selectedEntry, setSelectedEntry] = useState<EntryWithCategory | null>(null);
  const [detailOpen, setDetailOpen] = useState(false);
  const [categoryFilter, setCategoryFilter] = useState<string | undefined>();
  const [searchQuery, setSearchQuery] = useState('');

  const { data: entries, isLoading: entriesLoading } = useEntries(categoryFilter);
  const { data: categories } = useCategories();
  const authorToken = getAuthorToken();

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

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="sticky top-0 z-40 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="container mx-auto flex h-14 items-center justify-between px-4">
          <div className="flex items-center gap-2">
            <BookOpen className="h-5 w-5 text-primary" />
            <h1 className="text-lg font-bold tracking-tight">知识库</h1>
          </div>
          <Button size="sm" onClick={() => setSubmitOpen(true)}>
            <Plus className="h-4 w-4" />
            录入知识
          </Button>
        </div>
      </header>

      <main className="container mx-auto px-4 py-6 space-y-6">
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
        {categoryFilter && adminCategories.some(c => c.id === categoryFilter) && (
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
        ) : entries && entries.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {entries.map((entry) => (
              <EntryCard
                key={entry.id}
                entry={entry}
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
      <EntryDetail entry={selectedEntry} open={detailOpen} onOpenChange={setDetailOpen} />
    </div>
  );
};

export default Index;
