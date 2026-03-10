import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { format } from 'date-fns';
import { Pencil, Trash2, Share2, EyeOff, Check } from 'lucide-react';
import { MarkdownRenderer } from '@/components/MarkdownRenderer';
import { toast } from 'sonner';
import { useState } from 'react';
import type { EntryWithCategory } from '@/hooks/useEntries';

interface EntryDetailProps {
  entry: EntryWithCategory | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  canManage?: boolean;
  onEdit?: () => void;
  onDelete?: () => void;
}

export function EntryDetail({ entry, open, onOpenChange, canManage, onEdit, onDelete }: EntryDetailProps) {
  const [copied, setCopied] = useState(false);

  if (!entry) return null;

  const handleShare = async () => {
    const isPrivate = (entry as any).is_private;
    const shareToken = (entry as any).share_token;

    let url = `${window.location.origin}/?entry=${entry.id}`;
    if (isPrivate && shareToken) {
      url += `&share=${shareToken}`;
    }

    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      toast.success('链接已复制到剪贴板');
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error('复制失败，请手动复制');
    }
  };

  const isPrivate = (entry as any).is_private;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-start justify-between gap-2 pr-6">
            <div className="flex items-center gap-2 flex-wrap">
              <DialogTitle className="text-xl">{entry.title}</DialogTitle>
              {isPrivate && (
                <Badge variant="outline" className="text-xs gap-1">
                  <EyeOff className="h-3 w-3" />
                  私密
                </Badge>
              )}
            </div>
            <div className="flex gap-1 shrink-0">
              <Button size="icon" variant="ghost" className="h-8 w-8" onClick={handleShare}>
                {copied ? <Check className="h-4 w-4 text-primary" /> : <Share2 className="h-4 w-4" />}
              </Button>
              {canManage && (
                <>
                  <Button size="icon" variant="ghost" className="h-8 w-8" onClick={onEdit}>
                    <Pencil className="h-4 w-4" />
                  </Button>
                  <Button
                    size="icon"
                    variant="ghost"
                    className="h-8 w-8 text-destructive hover:text-destructive"
                    onClick={() => { onDelete?.(); onOpenChange(false); }}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </>
              )}
            </div>
          </div>
          <DialogDescription asChild>
            <div className="flex items-center gap-2 pt-1">
              {entry.categories && (
                <Badge variant="secondary">{entry.categories.name}</Badge>
              )}
              <span className="text-xs text-muted-foreground">
                {format(new Date(entry.created_at), 'yyyy-MM-dd HH:mm')}
              </span>
              {entry.contributors.length > 1 && (
                <span className="text-xs text-muted-foreground">
                  · {entry.contributors.length} 位贡献者
                </span>
              )}
            </div>
          </DialogDescription>
        </DialogHeader>
        <div className="mt-2">
          <MarkdownRenderer content={entry.content} />
        </div>
      </DialogContent>
    </Dialog>
  );
}
