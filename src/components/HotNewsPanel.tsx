import { useState } from 'react';
import { useHotNews, useHotNewsSources, useScrapeHotNews, useAddHotNewsSource, useToggleHotNewsSource, useDeleteHotNewsSource } from '@/hooks/useHotNews';
import type { HotNewsItem } from '@/hooks/useHotNews';
import { useIsAdmin } from '@/hooks/useAuth';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { Skeleton } from '@/components/ui/skeleton';
import { RefreshCw, Plus, Trash2, Flame, Settings2 } from 'lucide-react';
import { format } from 'date-fns';

// Source icon/color mapping
const SOURCE_COLORS: Record<string, string> = {
  'Anthropic': 'hsl(25, 80%, 55%)',
  'ChatGPT': 'hsl(160, 60%, 45%)',
  'Google AI': 'hsl(210, 80%, 55%)',
  'Meta AI': 'hsl(220, 70%, 55%)',
  'Grok': 'hsl(0, 0%, 70%)',
  'X/Twitter': 'hsl(0, 0%, 60%)',
  'DeepSeek': 'hsl(200, 80%, 50%)',
  'Alibaba AI': 'hsl(20, 90%, 55%)',
  '月之暗面': 'hsl(260, 60%, 55%)',
  '智谱AI': 'hsl(180, 60%, 45%)',
  'MiniMax': 'hsl(340, 70%, 55%)',
};

function getSourceColor(name: string) {
  return SOURCE_COLORS[name] || 'hsl(var(--cyber-accent))';
}

// Group news by date
function groupByDate(items: HotNewsItem[]) {
  const groups = new Map<string, HotNewsItem[]>();
  for (const item of items) {
    const date = item.news_date;
    if (!groups.has(date)) groups.set(date, []);
    groups.get(date)!.push(item);
  }
  return Array.from(groups.entries());
}

function NewsCard({ item, variant }: { item: HotNewsItem; variant: 'cyber' | 'default' }) {
  const color = getSourceColor(item.source_name);

  if (variant === 'cyber') {
    return (
      <div className="group p-3 border border-[hsl(var(--cyber-border))] hover:border-[hsl(var(--cyber-accent)/0.4)] bg-[hsl(var(--cyber-surface))] transition-all">
        <div className="flex items-start gap-2 mb-1.5">
          <div className="w-1 h-8 rounded-full flex-shrink-0" style={{ backgroundColor: color }} />
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <span className="text-[10px] font-mono font-bold px-1.5 py-0.5 border" style={{ color, borderColor: color + '40' }}>
                {item.source_name}
              </span>
            </div>
            <h4 className="text-sm font-bold text-[hsl(var(--cyber-text))] line-clamp-2 leading-tight">{item.title}</h4>
            <p className="text-xs text-[hsl(var(--cyber-text-muted))] line-clamp-2 mt-1">{item.content}</p>
            <div className="flex items-center gap-1.5 mt-2">
              {item.keywords.slice(0, 3).map((kw, i) => (
                <span key={i} className="text-[9px] px-1.5 py-0.5 border border-[hsl(var(--cyber-border))] text-[hsl(var(--cyber-text-secondary))] font-mono">
                  {kw}
                </span>
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="group p-4 rounded-lg border border-border/50 hover:border-primary/30 bg-card transition-all">
      <div className="flex items-start gap-3">
        <div className="w-1.5 h-10 rounded-full flex-shrink-0" style={{ backgroundColor: color }} />
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <Badge variant="outline" className="text-[10px] h-5" style={{ color, borderColor: color + '40' }}>
              {item.source_name}
            </Badge>
          </div>
          <h4 className="text-sm font-semibold line-clamp-2 leading-tight">{item.title}</h4>
          <p className="text-xs text-muted-foreground line-clamp-2 mt-1">{item.content}</p>
          <div className="flex items-center gap-1.5 mt-2">
            {item.keywords.slice(0, 3).map((kw, i) => (
              <Badge key={i} variant="secondary" className="text-[9px] h-4 px-1.5">{kw}</Badge>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

// Admin panel for managing sources
function SourceManager() {
  const { data: sources } = useHotNewsSources();
  const toggleSource = useToggleHotNewsSource();
  const deleteSource = useDeleteHotNewsSource();
  const addSource = useAddHotNewsSource();
  const [showAdd, setShowAdd] = useState(false);
  const [newName, setNewName] = useState('');
  const [newUrl, setNewUrl] = useState('');
  const [newKeywords, setNewKeywords] = useState('');

  const handleAdd = () => {
    if (!newName.trim() || !newUrl.trim()) return;
    addSource.mutate({
      name: newName.trim(),
      url: newUrl.trim(),
      keywords: newKeywords.split(',').map(k => k.trim()).filter(Boolean),
      max_items: 2,
    });
    setNewName('');
    setNewUrl('');
    setNewKeywords('');
    setShowAdd(false);
  };

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <h4 className="text-xs font-bold tracking-wider text-muted-foreground uppercase">数据源管理</h4>
        <Button size="sm" variant="outline" className="h-7 text-xs" onClick={() => setShowAdd(!showAdd)}>
          <Plus className="h-3 w-3" />添加
        </Button>
      </div>

      {showAdd && (
        <div className="p-3 border border-border rounded-lg space-y-2 bg-muted/30">
          <Input placeholder="名称 (如: TechCrunch)" value={newName} onChange={e => setNewName(e.target.value)} className="h-8 text-xs" />
          <Input placeholder="URL (如: https://techcrunch.com)" value={newUrl} onChange={e => setNewUrl(e.target.value)} className="h-8 text-xs" />
          <Input placeholder="关键字 (逗号分隔)" value={newKeywords} onChange={e => setNewKeywords(e.target.value)} className="h-8 text-xs" />
          <div className="flex gap-2">
            <Button size="sm" className="h-7 text-xs" onClick={handleAdd}>确认添加</Button>
            <Button size="sm" variant="ghost" className="h-7 text-xs" onClick={() => setShowAdd(false)}>取消</Button>
          </div>
        </div>
      )}

      <div className="space-y-1 max-h-[300px] overflow-y-auto">
        {sources?.map(src => (
          <div key={src.id} className="flex items-center justify-between p-2 rounded border border-border/30 text-xs">
            <div className="flex items-center gap-2 flex-1 min-w-0">
              <Switch
                checked={src.is_enabled}
                onCheckedChange={(checked) => toggleSource.mutate({ id: src.id, is_enabled: checked })}
                className="scale-75"
              />
              <span className="font-medium truncate">{src.name}</span>
            </div>
            <Button size="icon" variant="ghost" className="h-6 w-6 text-destructive" onClick={() => deleteSource.mutate(src.id)}>
              <Trash2 className="h-3 w-3" />
            </Button>
          </div>
        ))}
      </div>
    </div>
  );
}

// Main exported component
interface HotNewsPanelProps {
  variant?: 'cyber' | 'default';
}

export function HotNewsPanel({ variant = 'default' }: HotNewsPanelProps) {
  const { data: news, isLoading } = useHotNews();
  const scrape = useScrapeHotNews();
  const isAdmin = useIsAdmin();
  const [showAdmin, setShowAdmin] = useState(false);

  const dateGroups = news ? groupByDate(news) : [];

  if (variant === 'cyber') {
    return (
      <div className="h-full flex flex-col">
        {/* Header */}
        <div className="px-3 py-2 border-b border-[hsl(var(--cyber-border))] flex items-center justify-between flex-shrink-0">
          <div className="flex items-center gap-2">
            <Flame className="h-4 w-4 text-[hsl(var(--cyber-accent))]" />
            <span className="text-xs font-mono font-bold tracking-wider text-[hsl(var(--cyber-text))]">HOT NEWS</span>
            <span className="text-[9px] font-mono text-[hsl(var(--cyber-text-dim))]">{news?.length || 0} items</span>
          </div>
          {isAdmin && (
            <div className="flex items-center gap-1">
              <Button
                size="icon"
                variant="ghost"
                className="h-6 w-6"
                onClick={() => setShowAdmin(!showAdmin)}
                title="管理数据源"
              >
                <Settings2 className="h-3 w-3 text-[hsl(var(--cyber-text-dim))]" />
              </Button>
              <Button
                size="icon"
                variant="ghost"
                className="h-6 w-6"
                onClick={() => scrape.mutate()}
                disabled={scrape.isPending}
                title="立即抓取"
              >
                <RefreshCw className={`h-3 w-3 text-[hsl(var(--cyber-accent))] ${scrape.isPending ? 'animate-spin' : ''}`} />
              </Button>
            </div>
          )}
        </div>

        {/* Admin panel */}
        {isAdmin && showAdmin && (
          <div className="p-3 border-b border-[hsl(var(--cyber-border))] bg-[hsl(var(--cyber-surface))]">
            <SourceManager />
          </div>
        )}

        {/* News list */}
        <div className="flex-1 overflow-y-auto">
          {isLoading ? (
            <div className="p-3 space-y-3">
              {Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className="space-y-2 animate-pulse">
                  <Skeleton className="h-3 w-16 bg-[hsl(var(--cyber-border))]" />
                  <Skeleton className="h-4 w-3/4 bg-[hsl(var(--cyber-border-subtle))]" />
                  <Skeleton className="h-3 w-full bg-[hsl(var(--cyber-border-subtle))]" />
                </div>
              ))}
            </div>
          ) : dateGroups.length > 0 ? (
            <div className="divide-y divide-[hsl(var(--cyber-border-subtle))]">
              {dateGroups.map(([date, items]) => (
                <div key={date}>
                  <div className="px-3 py-1.5 text-[9px] font-mono tracking-[0.15em] text-[hsl(var(--cyber-text-dim))] uppercase bg-[hsl(var(--cyber-surface))]">
                    {date === new Date().toISOString().split('T')[0] ? '今日热点' : date}
                  </div>
                  <div className="space-y-0">
                    {items.map(item => (
                      <NewsCard key={item.id} item={item} variant="cyber" />
                    ))}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="flex-1 flex items-center justify-center p-6 text-center">
              <div>
                <Flame className="h-8 w-8 text-[hsl(var(--cyber-accent)/0.2)] mx-auto mb-2" />
                <p className="text-xs font-mono text-[hsl(var(--cyber-text-dim))]">暂无热点新闻</p>
                {isAdmin && (
                  <Button
                    size="sm"
                    className="mt-3 text-xs bg-[hsl(var(--cyber-accent))] text-[hsl(var(--cyber-accent-contrast))]"
                    onClick={() => scrape.mutate()}
                    disabled={scrape.isPending}
                  >
                    <RefreshCw className={`h-3 w-3 ${scrape.isPending ? 'animate-spin' : ''}`} />
                    立即抓取
                  </Button>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    );
  }

  // Default variant for editorial/neu styles
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Flame className="h-5 w-5 text-primary" />
          <h2 className="text-lg font-bold">热点新闻</h2>
          <Badge variant="secondary" className="text-xs">{news?.length || 0}</Badge>
        </div>
        {isAdmin && (
          <div className="flex items-center gap-2">
            <Button size="sm" variant="outline" className="h-8 text-xs" onClick={() => setShowAdmin(!showAdmin)}>
              <Settings2 className="h-3.5 w-3.5" />管理
            </Button>
            <Button size="sm" className="h-8 text-xs" onClick={() => scrape.mutate()} disabled={scrape.isPending}>
              <RefreshCw className={`h-3.5 w-3.5 ${scrape.isPending ? 'animate-spin' : ''}`} />
              抓取更新
            </Button>
          </div>
        )}
      </div>

      {isAdmin && showAdmin && (
        <div className="p-4 border border-border rounded-lg bg-muted/30">
          <SourceManager />
        </div>
      )}

      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="p-4 rounded-lg border border-border/50 space-y-2 animate-pulse">
              <Skeleton className="h-4 w-20" />
              <Skeleton className="h-5 w-3/4" />
              <Skeleton className="h-4 w-full" />
            </div>
          ))}
        </div>
      ) : dateGroups.length > 0 ? (
        <div className="space-y-4">
          {dateGroups.map(([date, items]) => (
            <div key={date}>
              <p className="text-xs font-medium text-muted-foreground mb-2">
                {date === new Date().toISOString().split('T')[0] ? '🔥 今日热点' : date}
              </p>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {items.map(item => (
                  <NewsCard key={item.id} item={item} variant="default" />
                ))}
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="text-center py-12">
          <Flame className="h-10 w-10 text-muted-foreground/30 mx-auto mb-3" />
          <p className="text-sm text-muted-foreground">暂无热点新闻</p>
          {isAdmin && (
            <Button size="sm" className="mt-3" onClick={() => scrape.mutate()} disabled={scrape.isPending}>
              <RefreshCw className={`h-3.5 w-3.5 ${scrape.isPending ? 'animate-spin' : ''}`} />
              立即抓取
            </Button>
          )}
        </div>
      )}
    </div>
  );
}
