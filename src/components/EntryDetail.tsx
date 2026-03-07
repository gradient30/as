import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { format } from 'date-fns';
import type { EntryWithCategory } from '@/hooks/useEntries';

interface EntryDetailProps {
  entry: EntryWithCategory | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function EntryDetail({ entry, open, onOpenChange }: EntryDetailProps) {
  if (!entry) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-xl">{entry.title}</DialogTitle>
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
