import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { format } from 'date-fns';
import { Pencil, Trash2, EyeOff, Eye, User } from 'lucide-react';
import type { EntryWithCategory } from '@/hooks/useEntries';

interface EntryCardProps {
  entry: EntryWithCategory;
  onClick?: () => void;
  isManageMode?: boolean;
  canManage?: boolean;
  isOwn?: boolean;
  onEdit?: () => void;
  onDelete?: () => void;
  onToggleVisibility?: () => void;
}

export function EntryCard({ entry, onClick, isManageMode, canManage, isOwn, onEdit, onDelete, onToggleVisibility }: EntryCardProps) {
  const isPrivate = entry.is_private;

  return (
    <Card
      className="cursor-pointer transition-all duration-200 hover:shadow-md hover:-translate-y-0.5 border-border/60 relative group"
      onClick={onClick}
    >
      {/* Own entry badge */}
      {isOwn && (
        <div className="absolute top-0 left-0 z-10">
          <div className="bg-primary text-primary-foreground text-[10px] font-bold px-2 py-0.5 rounded-br-lg rounded-tl-[calc(var(--radius)-1px)] flex items-center gap-1">
            <User className="h-3 w-3" />
            我的
          </div>
        </div>
      )}

      {/* Admin overlay actions */}
      {isManageMode && canManage && (
        <div className="absolute top-2 right-2 flex gap-1 z-10 opacity-0 group-hover:opacity-100 transition-opacity">
          <Button
            size="icon"
            variant="secondary"
            className="h-7 w-7"
            onClick={(e) => { e.stopPropagation(); onToggleVisibility?.(); }}
            title={isPrivate ? '设为公开' : '设为私密'}
          >
            {isPrivate ? <Eye className="h-3.5 w-3.5" /> : <EyeOff className="h-3.5 w-3.5" />}
          </Button>
          <Button
            size="icon"
            variant="secondary"
            className="h-7 w-7"
            onClick={(e) => { e.stopPropagation(); onEdit?.(); }}
          >
            <Pencil className="h-3.5 w-3.5" />
          </Button>
          <Button
            size="icon"
            variant="secondary"
            className="h-7 w-7 text-destructive hover:text-destructive"
            onClick={(e) => { e.stopPropagation(); onDelete?.(); }}
          >
            <Trash2 className="h-3.5 w-3.5" />
          </Button>
        </div>
      )}

      <CardHeader className="pb-2">
        <div className="flex items-start justify-between gap-2">
          <CardTitle className="text-base font-semibold leading-snug line-clamp-2">
            {entry.title}
          </CardTitle>
          {isPrivate && (
            <Badge variant="outline" className="text-xs gap-1 shrink-0">
              <EyeOff className="h-3 w-3" />
              私密
            </Badge>
          )}
        </div>
        {entry.categories && (
          <Badge variant="secondary" className="w-fit text-xs mt-1">
            {entry.categories.name}
          </Badge>
        )}
      </CardHeader>
      <CardContent className="pt-0">
        <p className="text-sm text-muted-foreground line-clamp-3 mb-3">
          {entry.content.replace(/[#*`~\[\]>!|-]/g, '').replace(/\n/g, ' ').trim()}
        </p>
        <div className="flex items-center justify-between text-xs text-muted-foreground">
          <span>{format(new Date(entry.created_at), 'yyyy-MM-dd HH:mm')}</span>
          {entry.contributors.length > 1 && (
            <span>{entry.contributors.length} 位贡献者</span>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
