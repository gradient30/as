import { useState, useMemo } from 'react';
import { format } from 'date-fns';
import { Search, Plus, Wifi, Command, X, RefreshCw, Copy, Maximize2, Pencil, EyeOff, Clock, BookOpen, FileText, ArrowRight } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { MarkdownRenderer } from '@/components/MarkdownRenderer';
import { Skeleton } from '@/components/ui/skeleton';
import type { EntryWithCategory } from '@/hooks/useEntries';
import type { CategoryRow } from '@/hooks/useEntries';
import { toast } from 'sonner';

// ===== Helper functions =====
function getReadCount(id: string): number {
  let hash = 0;
  for (let i = 0; i < id.length; i++) hash = ((hash << 5) - hash) + id.charCodeAt(i);
  return Math.abs(hash % 500) + 10;
}

function getCategoryEmoji(name?: string): string {
  if (!name) return '📝';
  const map: Record<string, string> = { '技术开发': '⚙️', '产品设计': '🦞', '运营管理': '📊', '学习笔记': '📚', '新闻时事': '📰' };
  return map[name] || '📝';
}

function extractHeadings(content: string): { level: number; text: string }[] {
  const lines = content.split('\n');
  return lines
    .filter(l => /^#{1,3}\s/.test(l))
    .map(l => {
      const match = l.match(/^(#{1,3})\s+(.+)/);
      if (!match) return null;
      return { level: match[1].length, text: match[2].replace(/[*`]/g, '') };
    })
    .filter(Boolean) as { level: number; text: string }[];
}

// ===== Left Sidebar Entry Item =====
function EntryListItem({ entry, isSelected, isOwn, onClick }: {
  entry: EntryWithCategory;
  isSelected: boolean;
  isOwn: boolean;
  onClick: () => void;
}) {
  const snippet = entry.content.replace(/[#*`~\[\]>!|-]/g, '').replace(/\n/g, ' ').trim();

  return (
    <div
      onClick={onClick}
      className={`p-3 cursor-pointer transition-all border-l-2 ${
        isSelected
          ? 'border-l-[hsl(180,100%,50%)] bg-[hsl(180,100%,50%/0.05)]'
          : 'border-l-transparent hover:bg-[hsl(220,40%,12%)]'
      }`}
    >
      <div className="flex items-center gap-2 mb-1.5">
        <span className="text-[10px] font-mono tracking-wider px-1.5 py-0.5 bg-[hsl(25,100%,50%)] text-[hsl(0,0%,0%)] font-bold">
          {entry.categories?.name || '未分类'}
        </span>
        <span className="text-[10px] text-[hsl(210,20%,50%)] font-mono ml-auto">
          {format(new Date(entry.created_at), 'HH:mm')}
        </span>
      </div>
      <h4 className="text-sm font-bold text-[hsl(0,0%,90%)] mb-1 flex items-center gap-1.5">
        <span>{getCategoryEmoji(entry.categories?.name)}</span>
        <span className="line-clamp-1">{entry.title}</span>
      </h4>
      <p className="text-[11px] text-[hsl(210,20%,55%)] line-clamp-2 leading-relaxed">
        {snippet.slice(0, 120)}
      </p>
    </div>
  );
}

// ===== Center Detail View =====
function DetailView({ entry, canManage, onEdit, onClose }: {
  entry: EntryWithCategory;
  canManage: boolean;
  onEdit: () => void;
  onClose: () => void;
}) {
  const wordCount = entry.content.length;
  const readTime = Math.max(1, Math.ceil(wordCount / 400));
  const reads = getReadCount(entry.id);
  const [fontSize, setFontSize] = useState(1); // 0=sm, 1=base, 2=lg, 3=xl

  const handleCopy = async () => {
    await navigator.clipboard.writeText(entry.content);
    toast.success('内容已复制');
  };

  const fontSizes = ['prose-sm', 'prose-base', 'prose-lg', 'prose-xl'];

  return (
    <div className="h-full flex flex-col">
      {/* Top bar */}
      <div className="flex items-center justify-between px-6 py-3 border-b border-[hsl(180,100%,50%/0.1)]">
        <div className="flex items-center gap-2">
          <span className="text-[10px] font-mono tracking-wider px-2 py-0.5 bg-[hsl(25,100%,50%)] text-[hsl(0,0%,0%)] font-bold">
            {entry.categories?.name || '未分类'}
          </span>
          {entry.is_private && (
            <span className="text-[10px] font-mono tracking-wider px-2 py-0.5 border border-[hsl(180,100%,50%/0.3)] text-[hsl(180,100%,70%)]">
              PERSONAL
            </span>
          )}
        </div>
        <div className="flex items-center gap-1">
          <Button size="icon" variant="ghost" className="h-8 w-8 text-[hsl(210,20%,60%)] hover:text-[hsl(0,0%,90%)]" title="刷新">
            <RefreshCw className="h-4 w-4" />
          </Button>
          <Button size="icon" variant="ghost" className="h-8 w-8 text-[hsl(210,20%,60%)] hover:text-[hsl(0,0%,90%)]" onClick={handleCopy} title="复制">
            <Copy className="h-4 w-4" />
          </Button>
          {canManage && (
            <Button size="icon" variant="ghost" className="h-8 w-8 text-[hsl(210,20%,60%)] hover:text-[hsl(0,0%,90%)]" onClick={onEdit} title="编辑">
              <Pencil className="h-4 w-4" />
            </Button>
          )}
          <Button size="icon" variant="ghost" className="h-8 w-8 text-[hsl(210,20%,60%)] hover:text-[hsl(0,0%,90%)]" onClick={onClose} title="关闭">
            <X className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Content area */}
      <div className="flex-1 overflow-y-auto px-8 py-6">
        {/* Title */}
        <h1 className="text-3xl font-black text-[hsl(0,0%,92%)] mb-4 flex items-center gap-3">
          <span className="text-2xl">{getCategoryEmoji(entry.categories?.name)}</span>
          {entry.title}
        </h1>

        {/* Meta row */}
        <div className="flex items-center gap-4 mb-4 text-[11px] text-[hsl(210,20%,55%)] font-mono">
          <span className="flex items-center gap-1"><Clock className="h-3 w-3" /> 创建时间 {format(new Date(entry.created_at), 'yyyy-MM-dd HH:mm')}</span>
          <span>字数 <strong className="text-[hsl(0,0%,80%)]">{wordCount} 字</strong></span>
          <span>阅读时长 <strong className="text-[hsl(0,0%,80%)]">{readTime} min</strong></span>
          <span>阅读量 <strong className="text-[hsl(0,0%,80%)]">{reads} 次</strong></span>
        </div>

        {/* Reading progress */}
        <div className="flex items-center gap-3 mb-6 pb-6 border-b border-[hsl(180,100%,50%/0.08)]">
          {/* Font size selector */}
          <span className="text-[10px] text-[hsl(210,20%,50%)] font-mono">字号</span>
          {['A', 'A', 'A', 'A'].map((label, i) => (
            <button
              key={i}
              onClick={() => setFontSize(i)}
              className={`w-7 h-7 flex items-center justify-center text-xs font-bold rounded transition-all ${
                fontSize === i
                  ? 'bg-[hsl(25,100%,50%)] text-[hsl(0,0%,0%)]'
                  : 'text-[hsl(210,20%,55%)] hover:text-[hsl(0,0%,80%)]'
              }`}
              style={{ fontSize: `${10 + i * 2}px` }}
            >
              {label}
            </button>
          ))}
          <span className="ml-4 text-[10px] text-[hsl(210,20%,50%)] font-mono">阅读进度 0%</span>
        </div>

        {/* Markdown content */}
        <div className={`${fontSizes[fontSize]} prose-invert max-w-none
          prose-headings:text-[hsl(25,100%,55%)] prose-headings:font-black prose-headings:border-l-2 prose-headings:border-[hsl(25,100%,50%)] prose-headings:pl-3
          prose-p:text-[hsl(210,15%,75%)] prose-p:leading-relaxed
          prose-strong:text-[hsl(0,0%,90%)]
          prose-a:text-[hsl(180,100%,60%)]
          prose-code:text-[hsl(180,80%,60%)]
          prose-li:text-[hsl(210,15%,75%)]
        `}>
          <MarkdownRenderer content={entry.content} />
        </div>

        {/* End marker */}
        <div className="mt-12 pt-6 border-t border-[hsl(180,100%,50%/0.08)] text-center">
          <span className="text-[10px] font-mono tracking-[0.3em] text-[hsl(210,20%,40%)]">END OF DOCUMENT</span>
        </div>
      </div>
    </div>
  );
}

// ===== Right Sidebar =====
function DocInfoSidebar({ entry }: { entry: EntryWithCategory }) {
  const headings = extractHeadings(entry.content);
  const wordCount = entry.content.length;
  const reads = getReadCount(entry.id);

  return (
    <div className="p-4 space-y-6 text-[11px] font-mono">
      {/* Doc info */}
      <div>
        <h3 className="text-[10px] tracking-[0.2em] text-[hsl(210,20%,50%)] uppercase mb-3">DOC INFO</h3>
        <div className="space-y-2">
          {[
            { label: '分类', value: entry.categories?.name || '未分类' },
            { label: '创建', value: format(new Date(entry.created_at), 'yyyy-MM-dd') },
            { label: '字数', value: String(wordCount) },
            { label: '阅读量', value: String(reads) },
          ].map(item => (
            <div key={item.label} className="flex items-center justify-between">
              <span className="text-[hsl(210,20%,50%)]">{item.label}</span>
              <span className="text-[hsl(0,0%,80%)]">{item.value}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Table of contents */}
      {headings.length > 0 && (
        <div>
          <h3 className="text-[10px] tracking-[0.2em] text-[hsl(210,20%,50%)] uppercase mb-3">目 录</h3>
          <div className="space-y-1.5">
            {headings.map((h, i) => (
              <div key={i} className="flex items-start gap-1.5" style={{ paddingLeft: `${(h.level - 1) * 12}px` }}>
                <span className="text-[hsl(180,100%,50%/0.4)] mt-1">○</span>
                <span className="text-[hsl(210,20%,65%)] hover:text-[hsl(0,0%,85%)] cursor-pointer transition-colors">{h.text}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Tags */}
      <div>
        <h3 className="text-[10px] tracking-[0.2em] text-[hsl(210,20%,50%)] uppercase mb-3">标 签</h3>
        <div className="flex flex-wrap gap-1.5">
          {[entry.categories?.name, ...(entry.content.match(/[\u4e00-\u9fff]{2,4}/g)?.slice(0, 4) || [])].filter(Boolean).map((tag, i) => (
            <span key={i} className="text-[10px] px-2 py-0.5 border border-[hsl(220,30%,25%)] text-[hsl(180,80%,55%)] hover:border-[hsl(180,100%,50%/0.4)] cursor-pointer transition-colors">
              {tag}
            </span>
          ))}
        </div>
      </div>
    </div>
  );
}

// ===== Main Cyberpunk Layout =====
interface CyberLayoutProps {
  entries: EntryWithCategory[] | undefined;
  entriesLoading: boolean;
  categories: CategoryRow[] | undefined;
  categoryFilter: string | undefined;
  setCategoryFilter: (id: string | undefined) => void;
  searchQuery: string;
  setSearchQuery: (q: string) => void;
  viewMode: 'discover' | 'mine';
  setViewMode: (v: 'discover' | 'mine') => void;
  selectedEntry: EntryWithCategory | null;
  setSelectedEntry: (e: EntryWithCategory | null) => void;
  canManageEntry: (e: EntryWithCategory) => boolean;
  isOwnEntry: (e: EntryWithCategory) => boolean;
  onEdit: (e: EntryWithCategory) => void;
  onSubmit: () => void;
  totalCount: number;
  currentTime: string;
  user: any;
  headerActions: React.ReactNode;
}

export function CyberLayout({
  entries, entriesLoading, categories, categoryFilter, setCategoryFilter,
  searchQuery, setSearchQuery, viewMode, setViewMode,
  selectedEntry, setSelectedEntry,
  canManageEntry, isOwnEntry, onEdit, onSubmit,
  totalCount, currentTime, user, headerActions,
}: CyberLayoutProps) {
  const l1Cats = categories?.filter(c => !c.parent_id && c.is_system) || [];

  return (
    <div className="h-[calc(100vh-41px)] flex flex-col">
      {/* Top nav bar */}
      <nav className="px-4 py-2.5 flex items-center justify-between border-b border-[hsl(180,100%,50%/0.1)] flex-shrink-0">
        <div className="flex items-center gap-3">
          <div className="h-7 w-7 rounded-full border border-[hsl(180,100%,50%/0.4)] flex items-center justify-center">
            <Command className="h-3.5 w-3.5 text-[hsl(180,100%,60%)]" />
          </div>
          <div>
            <h2 className="text-[11px] font-black tracking-[0.2em] text-[hsl(0,0%,88%)] uppercase font-mono">KNOWLEDGE</h2>
            <p className="text-[8px] tracking-[0.15em] text-[hsl(180,80%,50%/0.6)] font-mono">个人知识库</p>
          </div>
        </div>
        <div className="flex items-center gap-5 text-[11px] font-mono tracking-wider">
          <button
            onClick={() => setViewMode('discover')}
            className={`transition-colors ${viewMode === 'discover' ? 'text-[hsl(0,0%,75%)]' : 'text-[hsl(210,20%,45%)] hover:text-[hsl(0,0%,70%)]'}`}
          >
            发现
          </button>
          <button
            onClick={() => setViewMode('mine')}
            className={`transition-colors ${viewMode === 'mine' ? 'text-[hsl(180,100%,60%)] font-bold' : 'text-[hsl(210,20%,45%)] hover:text-[hsl(180,100%,60%)]'}`}
          >
            我的
          </button>
          <span className="text-[hsl(180,100%,60%)] text-sm font-black tracking-widest cyber-glow">{currentTime}</span>
          {headerActions}
        </div>
      </nav>

      {/* 3-column body */}
      <div className="flex flex-1 overflow-hidden">
        {/* LEFT SIDEBAR */}
        <aside className="w-[280px] flex-shrink-0 border-r border-[hsl(180,100%,50%/0.08)] flex flex-col">
          {/* Search */}
          <div className="p-3 border-b border-[hsl(180,100%,50%/0.06)]">
            <div className="relative">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-[hsl(210,20%,45%)]" />
              <Input
                placeholder="搜索..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-8 h-8 text-xs border-[hsl(220,30%,20%)] bg-[hsl(220,40%,8%)] text-[hsl(0,0%,85%)] placeholder:text-[hsl(210,20%,40%)] font-mono"
              />
            </div>
          </div>

          {/* Category tabs */}
          <div className="px-3 py-2 flex flex-wrap gap-1.5 border-b border-[hsl(180,100%,50%/0.06)]">
            <button
              className={`px-2.5 py-1 text-[10px] font-mono tracking-wider transition-all border ${
                !categoryFilter
                  ? 'border-[hsl(180,100%,50%/0.5)] bg-[hsl(180,100%,50%/0.1)] text-[hsl(180,100%,60%)] font-bold'
                  : 'border-[hsl(220,30%,25%)] text-[hsl(210,20%,60%)] hover:border-[hsl(180,100%,50%/0.3)]'
              }`}
              onClick={() => setCategoryFilter(undefined)}
            >
              全部
            </button>
            <button
              className={`px-2.5 py-1 text-[10px] font-mono tracking-wider transition-all border ${
                viewMode === 'mine'
                  ? 'border-[hsl(180,100%,50%/0.5)] bg-[hsl(180,100%,50%/0.1)] text-[hsl(180,100%,60%)] font-bold'
                  : 'border-[hsl(220,30%,25%)] text-[hsl(210,20%,60%)] hover:border-[hsl(180,100%,50%/0.3)]'
              }`}
              onClick={() => setViewMode(viewMode === 'mine' ? 'discover' : 'mine')}
            >
              我的
            </button>
          </div>

          {/* Entry count */}
          <div className="px-3 py-1.5 text-[9px] font-mono tracking-[0.15em] text-[hsl(210,20%,45%)] uppercase border-b border-[hsl(180,100%,50%/0.04)]">
            {entries?.length || 0} DOCUMENTS
          </div>

          {/* Entry list */}
          <div className="flex-1 overflow-y-auto">
            {entriesLoading ? (
              <div className="p-3 space-y-3">
                {Array.from({ length: 5 }).map((_, i) => (
                  <div key={i} className="space-y-2 animate-pulse">
                    <Skeleton className="h-4 w-16 bg-[hsl(220,30%,15%)]" />
                    <Skeleton className="h-4 w-3/4 bg-[hsl(220,30%,12%)]" />
                    <Skeleton className="h-3 w-full bg-[hsl(220,30%,10%)]" />
                  </div>
                ))}
              </div>
            ) : entries && entries.length > 0 ? (
              <div className="divide-y divide-[hsl(180,100%,50%/0.04)]">
                {entries.map(entry => (
                  <EntryListItem
                    key={entry.id}
                    entry={entry}
                    isSelected={selectedEntry?.id === entry.id}
                    isOwn={isOwnEntry(entry)}
                    onClick={() => setSelectedEntry(entry)}
                  />
                ))}
              </div>
            ) : (
              <div className="p-6 text-center text-[hsl(210,20%,45%)] text-xs font-mono">
                暂无文档
              </div>
            )}
          </div>
        </aside>

        {/* CENTER CONTENT */}
        <main className="flex-1 overflow-hidden bg-[hsl(220,45%,6%)]">
          {selectedEntry ? (
            <DetailView
              entry={selectedEntry}
              canManage={canManageEntry(selectedEntry)}
              onEdit={() => onEdit(selectedEntry)}
              onClose={() => setSelectedEntry(null)}
            />
          ) : (
            <div className="h-full flex flex-col items-center justify-center text-center px-8">
              <BookOpen className="h-16 w-16 text-[hsl(180,100%,50%/0.15)] mb-4" />
              <p className="text-[hsl(210,20%,50%)] font-mono text-sm mb-1">选择一篇文档开始阅读</p>
              <p className="text-[hsl(210,20%,35%)] font-mono text-xs mb-6">或创建新的知识条目</p>
              <Button
                onClick={onSubmit}
                className="bg-[hsl(180,100%,50%)] text-[hsl(220,50%,5%)] hover:bg-[hsl(180,100%,60%)] font-mono font-bold text-xs"
              >
                <Plus className="h-3.5 w-3.5" />新建
              </Button>
            </div>
          )}
        </main>

        {/* RIGHT SIDEBAR */}
        {selectedEntry && (
          <aside className="w-[200px] flex-shrink-0 border-l border-[hsl(180,100%,50%/0.08)] overflow-y-auto">
            <DocInfoSidebar entry={selectedEntry} />
          </aside>
        )}
      </div>

      {/* Status bar */}
      <footer className="border-t border-[hsl(180,100%,50%/0.1)] bg-[hsl(220,50%,5%)] flex-shrink-0">
        <div className="px-4 py-1.5 flex items-center justify-between text-[9px] font-mono tracking-[0.15em]">
          <div className="flex items-center gap-5">
            <span className="text-[hsl(210,20%,55%)]">STATUS: <span className="text-[hsl(120,80%,55%)] italic">OPERATIONAL</span></span>
            <span className="text-[hsl(210,20%,55%)]">NOTES: <span className="text-[hsl(0,0%,82%)] font-black">{String(totalCount).padStart(3, '0')} LOADED</span></span>
            <span className="hidden sm:inline text-[hsl(210,20%,55%)]">LAST SYNC: <span className="text-[hsl(180,80%,55%)]">{currentTime}</span></span>
          </div>
          <span className="text-[hsl(210,20%,55%)]">STORAGE: <span className="text-[hsl(180,100%,55%)]">{Math.min(99, 8 + totalCount * 2)}% USED</span></span>
        </div>
      </footer>
    </div>
  );
}
