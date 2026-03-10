import { useState, useCallback } from 'react';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import {
  Bold,
  Italic,
  Strikethrough,
  Code,
  List,
  ListOrdered,
  Link,
  Image,
  Quote,
  Heading1,
  Heading2,
  Heading3,
  Table,
  Minus,
  CheckSquare,
  FileCode,
} from 'lucide-react';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';

interface MarkdownEditorProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  rows?: number;
}

type MarkdownAction = {
  icon: React.ElementType;
  label: string;
  action: (text: string, selStart: number, selEnd: number) => { text: string; cursor: number };
};

const markdownActions: MarkdownAction[] = [
  {
    icon: Heading1, label: '一级标题',
    action: (t, s, e) => wrapLine(t, s, '# '),
  },
  {
    icon: Heading2, label: '二级标题',
    action: (t, s, e) => wrapLine(t, s, '## '),
  },
  {
    icon: Heading3, label: '三级标题',
    action: (t, s, e) => wrapLine(t, s, '### '),
  },
  {
    icon: Bold, label: '粗体',
    action: (t, s, e) => wrapSelection(t, s, e, '**', '**'),
  },
  {
    icon: Italic, label: '斜体',
    action: (t, s, e) => wrapSelection(t, s, e, '*', '*'),
  },
  {
    icon: Strikethrough, label: '删除线',
    action: (t, s, e) => wrapSelection(t, s, e, '~~', '~~'),
  },
  {
    icon: Code, label: '代码',
    action: (t, s, e) => {
      const sel = t.slice(s, e);
      if (sel.includes('\n')) return wrapSelection(t, s, e, '```\n', '\n```');
      return wrapSelection(t, s, e, '`', '`');
    },
  },
  {
    icon: Quote, label: '引用',
    action: (t, s, e) => wrapLine(t, s, '> '),
  },
  {
    icon: List, label: '无序列表',
    action: (t, s, e) => wrapLine(t, s, '- '),
  },
  {
    icon: ListOrdered, label: '有序列表',
    action: (t, s, e) => wrapLine(t, s, '1. '),
  },
  {
    icon: CheckSquare, label: '任务列表',
    action: (t, s, e) => wrapLine(t, s, '- [ ] '),
  },
  {
    icon: Link, label: '链接',
    action: (t, s, e) => {
      const sel = t.slice(s, e) || '链接文字';
      const result = t.slice(0, s) + `[${sel}](url)` + t.slice(e);
      return { text: result, cursor: s + sel.length + 3 };
    },
  },
  {
    icon: Image, label: '图片',
    action: (t, s, e) => {
      const result = t.slice(0, s) + `![alt](url)` + t.slice(e);
      return { text: result, cursor: s + 6 };
    },
  },
  {
    icon: Table, label: '表格',
    action: (t, s, e) => {
      const table = '| 列1 | 列2 | 列3 |\n| --- | --- | --- |\n| 内容 | 内容 | 内容 |';
      const result = t.slice(0, s) + table + t.slice(e);
      return { text: result, cursor: s + table.length };
    },
  },
  {
    icon: Minus, label: '分割线',
    action: (t, s, e) => {
      const result = t.slice(0, s) + '\n---\n' + t.slice(e);
      return { text: result, cursor: s + 5 };
    },
  },
];

function wrapSelection(text: string, start: number, end: number, before: string, after: string) {
  const sel = text.slice(start, end) || '文本';
  const result = text.slice(0, start) + before + sel + after + text.slice(end);
  return { text: result, cursor: start + before.length + sel.length };
}

function wrapLine(text: string, cursor: number, prefix: string) {
  const lineStart = text.lastIndexOf('\n', cursor - 1) + 1;
  const result = text.slice(0, lineStart) + prefix + text.slice(lineStart);
  return { text: result, cursor: cursor + prefix.length };
}

export function MarkdownEditor({ value, onChange, placeholder, rows = 8 }: MarkdownEditorProps) {
  const [tab, setTab] = useState<string>('write');
  const [textareaRef, setTextareaRef] = useState<HTMLTextAreaElement | null>(null);

  const handleAction = useCallback(
    (action: MarkdownAction['action']) => {
      if (!textareaRef) return;
      const start = textareaRef.selectionStart;
      const end = textareaRef.selectionEnd;
      const { text, cursor } = action(value, start, end);
      onChange(text);
      // Restore cursor position after React re-render
      requestAnimationFrame(() => {
        textareaRef.focus();
        textareaRef.setSelectionRange(cursor, cursor);
      });
    },
    [textareaRef, value, onChange]
  );

  return (
    <div className="border rounded-md border-input overflow-hidden">
      <Tabs value={tab} onValueChange={setTab}>
        <div className="flex items-center justify-between border-b border-border bg-muted/30 px-2">
          <TabsList className="h-9 bg-transparent p-0 gap-0">
            <TabsTrigger
              value="write"
              className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent data-[state=active]:shadow-none px-3 text-xs"
            >
              编辑
            </TabsTrigger>
            <TabsTrigger
              value="preview"
              className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent data-[state=active]:shadow-none px-3 text-xs"
            >
              预览
            </TabsTrigger>
          </TabsList>
        </div>

        {/* Toolbar - only shown in write mode */}
        {tab === 'write' && (
          <div className="flex flex-wrap items-center gap-0.5 px-2 py-1 border-b border-border bg-muted/20">
            <TooltipProvider delayDuration={300}>
              {markdownActions.map((ma, i) => (
                <Tooltip key={i}>
                  <TooltipTrigger asChild>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7"
                      onClick={() => handleAction(ma.action)}
                    >
                      <ma.icon className="h-3.5 w-3.5" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent side="bottom" className="text-xs">
                    {ma.label}
                  </TooltipContent>
                </Tooltip>
              ))}
            </TooltipProvider>
          </div>
        )}

        <TabsContent value="write" className="mt-0">
          <Textarea
            ref={setTextareaRef}
            value={value}
            onChange={(e) => onChange(e.target.value)}
            placeholder={placeholder}
            rows={rows}
            className="border-0 rounded-none focus-visible:ring-0 resize-y font-mono text-sm"
          />
        </TabsContent>

        <TabsContent value="preview" className="mt-0">
          <div className="p-4 min-h-[calc(1.5rem*8+1.5rem)] max-h-96 overflow-y-auto">
            {value.trim() ? (
              <div className="prose prose-sm dark:prose-invert max-w-none">
                <ReactMarkdown remarkPlugins={[remarkGfm]}>{value}</ReactMarkdown>
              </div>
            ) : (
              <p className="text-sm text-muted-foreground italic">暂无内容可预览</p>
            )}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
