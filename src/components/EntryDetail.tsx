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
import { Pencil, Trash2 } from 'lucide-react';
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
  if (!entry) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-start justify-between gap-2 pr-6">
            <DialogTitle className="text-xl">{entry.title}</DialogTitle>
            {canManage && (
              <div className="flex gap-1 shrink-0">
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
              </div>
            )}
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
        <div className="prose prose-sm max-w-none text-foreground whitespace-pre-wrap mt-2">
          {entry.content}
        </div>
      </DialogContent>
    </Dialog>
  );
}
