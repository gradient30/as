import { useState } from 'react';
import { useCategories, usePendingCategories, useApproveCategory, useRejectCategory } from '@/hooks/useEntries';
import type { CategoryRow } from '@/hooks/useEntries';
import { supabase } from '@/integrations/supabase/client';
import { useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
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
import { toast } from 'sonner';
import { Plus, Pencil, Trash2, Tags, Check, X, ChevronRight, Shield, Clock } from 'lucide-react';

interface CategoryManagerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function CategoryManager({ open, onOpenChange }: CategoryManagerProps) {
  const { data: categories } = useCategories();
  const { data: pendingCategories } = usePendingCategories();
  const approveCategory = useApproveCategory();
  const rejectCategory = useRejectCategory();
  const queryClient = useQueryClient();
  const [editId, setEditId] = useState<string | null>(null);
  const [editName, setEditName] = useState('');
  const [editKeywords, setEditKeywords] = useState('');
  const [editParentId, setEditParentId] = useState<string>('');
  const [newName, setNewName] = useState('');
  const [newKeywords, setNewKeywords] = useState('');
  const [newParentId, setNewParentId] = useState<string>('');
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<'system' | 'pending'>('system');

  const l1Categories = categories?.filter(c => !c.parent_id && c.is_system) || [];
  const l2Categories = categories?.filter(c => c.parent_id && c.is_approved) || [];

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: ['categories'] });
    queryClient.invalidateQueries({ queryKey: ['entries'] });
  };

  const handleCreate = async () => {
    if (!newName.trim()) return;
    setLoading(true);
    try {
      const keywords = newKeywords.split(/[,，、\s]+/).filter(Boolean);
      const slug = newName.trim().toLowerCase().replace(/\s+/g, '-') + '-' + Date.now();
      const isL1 = !newParentId;
      const { error } = await supabase.from('categories').insert({
        name: newName.trim(),
        slug,
        keywords,
        created_by_token: 'admin',
        parent_id: newParentId || null,
        is_system: isL1,
        is_approved: true,
      });
      if (error) throw error;
      toast.success(isL1 ? '一级分类已创建' : '二级分类已创建');
      setNewName('');
      setNewKeywords('');
      setNewParentId('');
      invalidate();
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleUpdate = async () => {
    if (!editId || !editName.trim()) return;
    setLoading(true);
    try {
      const keywords = editKeywords.split(/[,，、\s]+/).filter(Boolean);
      const updates: Record<string, unknown> = { name: editName.trim(), keywords };
      if (editParentId) updates.parent_id = editParentId;
      const { error } = await supabase
        .from('categories')
        .update(updates)
        .eq('id', editId);
      if (error) throw error;
      toast.success('分类已更新');
      setEditId(null);
      invalidate();
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteId) return;
    setLoading(true);
    try {
      await supabase.from('entries').update({ category_id: null }).eq('category_id', deleteId);
      // Also delete child categories
      const children = categories?.filter(c => c.parent_id === deleteId) || [];
      for (const child of children) {
        await supabase.from('entries').update({ category_id: null }).eq('category_id', child.id);
        await supabase.from('category_admins').delete().eq('category_id', child.id);
        await supabase.from('categories').delete().eq('id', child.id);
      }
      await supabase.from('category_admins').delete().eq('category_id', deleteId);
      const { error } = await supabase.from('categories').delete().eq('id', deleteId);
      if (error) throw error;
      toast.success('分类已删除');
      setDeleteId(null);
      invalidate();
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setLoading(false);
    }
  };

  const startEdit = (cat: CategoryRow) => {
    setEditId(cat.id);
    setEditName(cat.name);
    setEditKeywords(cat.keywords.join(', '));
    setEditParentId(cat.parent_id || '');
  };

  const handleApprove = (cat: CategoryRow) => {
    approveCategory.mutate({ id: cat.id });
  };

  const handleReject = (id: string) => {
    rejectCategory.mutate(id);
  };

  const getChildCategories = (parentId: string) => {
    return l2Categories.filter(c => c.parent_id === parentId);
  };

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="sm:max-w-[560px] max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Tags className="h-5 w-5" />
              分类管理
            </DialogTitle>
          </DialogHeader>

          {/* Tabs */}
          <div className="flex gap-2 border-b pb-2">
            <Button
              size="sm"
              variant={activeTab === 'system' ? 'default' : 'ghost'}
              onClick={() => setActiveTab('system')}
            >
              <Shield className="h-4 w-4" />
              分类体系
            </Button>
            <Button
              size="sm"
              variant={activeTab === 'pending' ? 'default' : 'ghost'}
              onClick={() => setActiveTab('pending')}
              className="relative"
            >
              <Clock className="h-4 w-4" />
              待审核
              {pendingCategories && pendingCategories.length > 0 && (
                <Badge variant="destructive" className="ml-1 h-5 min-w-5 text-[10px] px-1">
                  {pendingCategories.length}
                </Badge>
              )}
            </Button>
          </div>

          {activeTab === 'system' && (
            <>
              {/* Create new */}
              <div className="space-y-2 border rounded-lg p-3 bg-muted/30">
                <Label className="text-sm font-medium">新建分类</Label>
                <Input
                  placeholder="分类名称"
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                />
                <Select value={newParentId} onValueChange={setNewParentId}>
                  <SelectTrigger>
                    <SelectValue placeholder="一级分类（留空则创建一级分类）" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">无（创建一级分类）</SelectItem>
                    {l1Categories.map(cat => (
                      <SelectItem key={cat.id} value={cat.id}>{cat.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Input
                  placeholder="关键词（逗号分隔，用于自动分类）"
                  value={newKeywords}
                  onChange={(e) => setNewKeywords(e.target.value)}
                />
                <Button size="sm" onClick={handleCreate} disabled={loading || !newName.trim()}>
                  <Plus className="h-4 w-4" />
                  创建
                </Button>
              </div>

              {/* Hierarchical list */}
              <div className="space-y-1">
                {l1Categories.map((l1) => (
                  <div key={l1.id} className="space-y-1">
                    <CategoryItem
                      cat={l1}
                      isL1
                      editId={editId}
                      editName={editName}
                      editKeywords={editKeywords}
                      editParentId={editParentId}
                      l1Categories={l1Categories}
                      loading={loading}
                      onEdit={() => startEdit(l1)}
                      onDelete={() => setDeleteId(l1.id)}
                      onSave={handleUpdate}
                      onCancel={() => setEditId(null)}
                      onEditNameChange={setEditName}
                      onEditKeywordsChange={setEditKeywords}
                      onEditParentChange={setEditParentId}
                    />
                    {/* L2 children */}
                    {getChildCategories(l1.id).map(l2 => (
                      <div key={l2.id} className="ml-6">
                        <CategoryItem
                          cat={l2}
                          editId={editId}
                          editName={editName}
                          editKeywords={editKeywords}
                          editParentId={editParentId}
                          l1Categories={l1Categories}
                          loading={loading}
                          onEdit={() => startEdit(l2)}
                          onDelete={() => setDeleteId(l2.id)}
                          onSave={handleUpdate}
                          onCancel={() => setEditId(null)}
                          onEditNameChange={setEditName}
                          onEditKeywordsChange={setEditKeywords}
                          onEditParentChange={setEditParentId}
                        />
                      </div>
                    ))}
                  </div>
                ))}
                {l1Categories.length === 0 && (
                  <p className="text-sm text-muted-foreground text-center py-4">暂无分类</p>
                )}
              </div>
            </>
          )}

          {activeTab === 'pending' && (
            <div className="space-y-2">
              {pendingCategories && pendingCategories.length > 0 ? (
                pendingCategories.map(cat => (
                  <div key={cat.id} className="border rounded-lg p-3 space-y-2">
                    {editId === cat.id ? (
                      <>
                        <Input value={editName} onChange={(e) => setEditName(e.target.value)} placeholder="分类名称" />
                        <Select value={editParentId} onValueChange={setEditParentId}>
                          <SelectTrigger>
                            <SelectValue placeholder="所属一级分类" />
                          </SelectTrigger>
                          <SelectContent>
                            {l1Categories.map(c => (
                              <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <Input value={editKeywords} onChange={(e) => setEditKeywords(e.target.value)} placeholder="关键词" />
                        <div className="flex gap-2">
                          <Button size="sm" onClick={async () => {
                            await handleUpdate();
                            approveCategory.mutate({ id: cat.id });
                          }} disabled={loading}>
                            <Check className="h-3.5 w-3.5" />
                            保存并通过
                          </Button>
                          <Button size="sm" variant="ghost" onClick={() => setEditId(null)}>取消</Button>
                        </div>
                      </>
                    ) : (
                      <div className="flex items-center justify-between gap-2">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <p className="font-medium text-sm truncate">{cat.name}</p>
                            <Badge variant="outline" className="text-[10px] shrink-0">待审核</Badge>
                          </div>
                          <p className="text-xs text-muted-foreground truncate mt-0.5">
                            关键词：{cat.keywords.join(', ')}
                          </p>
                          {cat.parent_id && (
                            <p className="text-xs text-muted-foreground">
                              归属：{l1Categories.find(c => c.id === cat.parent_id)?.name || '未分类'}
                            </p>
                          )}
                        </div>
                        <div className="flex gap-1 shrink-0">
                          <Button
                            size="icon"
                            variant="ghost"
                            className="h-7 w-7 text-green-600 hover:text-green-700"
                            onClick={() => handleApprove(cat)}
                            title="审核通过"
                          >
                            <Check className="h-3.5 w-3.5" />
                          </Button>
                          <Button
                            size="icon"
                            variant="ghost"
                            className="h-7 w-7 text-destructive hover:text-destructive"
                            onClick={() => handleReject(cat.id)}
                            title="拒绝"
                          >
                            <X className="h-3.5 w-3.5" />
                          </Button>
                          <Button
                            size="icon"
                            variant="ghost"
                            className="h-7 w-7"
                            onClick={() => startEdit(cat)}
                            title="编辑后通过"
                          >
                            <Pencil className="h-3.5 w-3.5" />
                          </Button>
                        </div>
                      </div>
                    )}
                  </div>
                ))
              ) : (
                <p className="text-sm text-muted-foreground text-center py-8">暂无待审核分类</p>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!deleteId} onOpenChange={(o) => !o && setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>确认删除分类</AlertDialogTitle>
            <AlertDialogDescription>
              删除后该分类及其子分类下的条目将变为未分类状态，此操作不可撤销。
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>取消</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete}>确认删除</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}

// Sub-component for a single category item
function CategoryItem({
  cat, isL1, editId, editName, editKeywords, editParentId, l1Categories, loading,
  onEdit, onDelete, onSave, onCancel, onEditNameChange, onEditKeywordsChange, onEditParentChange,
}: {
  cat: CategoryRow;
  isL1?: boolean;
  editId: string | null;
  editName: string;
  editKeywords: string;
  editParentId: string;
  l1Categories: CategoryRow[];
  loading: boolean;
  onEdit: () => void;
  onDelete: () => void;
  onSave: () => void;
  onCancel: () => void;
  onEditNameChange: (v: string) => void;
  onEditKeywordsChange: (v: string) => void;
  onEditParentChange: (v: string) => void;
}) {
  if (editId === cat.id) {
    return (
      <div className="border rounded-lg p-3 space-y-2 bg-muted/20">
        <Input value={editName} onChange={(e) => onEditNameChange(e.target.value)} placeholder="分类名称" />
        {!isL1 && (
          <Select value={editParentId} onValueChange={onEditParentChange}>
            <SelectTrigger>
              <SelectValue placeholder="所属一级分类" />
            </SelectTrigger>
            <SelectContent>
              {l1Categories.map(c => (
                <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}
        <Input value={editKeywords} onChange={(e) => onEditKeywordsChange(e.target.value)} placeholder="关键词" />
        <div className="flex gap-2">
          <Button size="sm" onClick={onSave} disabled={loading}>保存</Button>
          <Button size="sm" variant="ghost" onClick={onCancel}>取消</Button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex items-center justify-between border rounded-lg p-3 gap-2">
      <div className="flex-1 min-w-0 flex items-center gap-2">
        {isL1 ? (
          <ChevronRight className="h-4 w-4 text-primary shrink-0" />
        ) : (
          <span className="w-4" />
        )}
        <div className="min-w-0">
          <div className="flex items-center gap-1.5">
            <p className="font-medium text-sm truncate">{cat.name}</p>
            {cat.is_system && (
              <Badge variant="secondary" className="text-[10px] shrink-0">系统</Badge>
            )}
          </div>
          <p className="text-xs text-muted-foreground truncate">{cat.keywords.join(', ')}</p>
        </div>
      </div>
      <div className="flex gap-1 shrink-0">
        <Button size="icon" variant="ghost" className="h-7 w-7" onClick={onEdit}>
          <Pencil className="h-3.5 w-3.5" />
        </Button>
        <Button
          size="icon"
          variant="ghost"
          className="h-7 w-7 text-destructive hover:text-destructive"
          onClick={onDelete}
        >
          <Trash2 className="h-3.5 w-3.5" />
        </Button>
      </div>
    </div>
  );
}
