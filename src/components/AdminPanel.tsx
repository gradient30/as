import { getAuthorToken } from '@/lib/author-token';
import {
  useCategoryAdmins,
  usePendingEntries,
  useApproveEntry,
  useDeleteEntry,
  useUpdateAutoMerge,
} from '@/hooks/useEntries';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Check, Trash2, Shield } from 'lucide-react';
import { Label } from '@/components/ui/label';

interface AdminPanelProps {
  categoryId: string;
  categoryName: string;
}

export function AdminPanel({ categoryId, categoryName }: AdminPanelProps) {
  const authorToken = getAuthorToken();
  const { data: admins } = useCategoryAdmins(categoryId);
  const { data: pendingEntries } = usePendingEntries(categoryId);
  const approveEntry = useApproveEntry();
  const deleteEntry = useDeleteEntry();
  const updateAutoMerge = useUpdateAutoMerge();

  const currentAdmin = admins?.find(a => a.admin_token === authorToken);
  if (!currentAdmin) return null;

  const isFounder = currentAdmin.is_founder;

  return (
    <Card className="border-primary/20">
      <CardHeader className="pb-3">
        <div className="flex items-center gap-2">
          <Shield className="h-4 w-4 text-primary" />
          <CardTitle className="text-sm">
            管理面板 — {categoryName}
          </CardTitle>
          {isFounder && <Badge className="text-xs">创始人</Badge>}
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Auto merge toggle */}
        <div className="flex items-center justify-between">
          <Label htmlFor="auto-merge" className="text-sm">自动合并</Label>
          <Switch
            id="auto-merge"
            checked={currentAdmin.auto_merge_enabled}
            onCheckedChange={(checked) =>
              updateAutoMerge.mutate({ adminId: currentAdmin.id, enabled: checked })
            }
          />
        </div>

        {/* Pending entries */}
        {pendingEntries && pendingEntries.length > 0 && (
          <div className="space-y-2">
            <p className="text-sm font-medium">待审核 ({pendingEntries.length})</p>
            {pendingEntries.map((entry) => (
              <div key={entry.id} className="flex items-center justify-between p-2 rounded-md bg-muted/50">
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">{entry.title}</p>
                  <p className="text-xs text-muted-foreground truncate">{entry.content}</p>
                </div>
                <div className="flex gap-1 ml-2">
                  <Button
                    size="icon"
                    variant="ghost"
                    className="h-7 w-7"
                    onClick={() => approveEntry.mutate(entry.id)}
                  >
                    <Check className="h-3.5 w-3.5" />
                  </Button>
                  <Button
                    size="icon"
                    variant="ghost"
                    className="h-7 w-7 text-destructive"
                    onClick={() => deleteEntry.mutate(entry.id)}
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}

        {(!pendingEntries || pendingEntries.length === 0) && (
          <p className="text-xs text-muted-foreground">暂无待审核条目</p>
        )}
      </CardContent>
    </Card>
  );
}
