import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import rehypeRaw from 'rehype-raw';
import { useState, useCallback, type ReactNode } from 'react';
import { Check, Copy, ClipboardCopy } from 'lucide-react';
import { toast } from 'sonner';

interface MarkdownRendererProps {
  content: string;
  className?: string;
  proseSize?: string;
}

/* ── Copy button shown on code blocks ── */
function CodeCopyButton({ code }: { code: string }) {
  const [copied, setCopied] = useState(false);
  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(code);
      setCopied(true);
      toast.success('代码已复制');
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error('复制失败');
    }
  };
  return (
    <button
      onClick={handleCopy}
      className="absolute top-2 right-2 p-1.5 rounded-md bg-muted/80 hover:bg-muted text-muted-foreground hover:text-foreground transition-all opacity-0 group-hover:opacity-100"
      title="复制代码"
    >
      {copied ? <Check className="h-3.5 w-3.5 text-primary" /> : <Copy className="h-3.5 w-3.5" />}
    </button>
  );
}

/* ── Blockquote / table wrapper with copy button ── */
function CopyableBlock({ children, label }: { children: ReactNode; label: string }) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    // Extract text from the rendered block via a temp element
    const el = document.createElement('div');
    const container = document.querySelector(`[data-block-id="${id}"]`);
    if (container) {
      try {
        await navigator.clipboard.writeText(container.textContent || '');
        setCopied(true);
        toast.success(`${label}已复制`);
        setTimeout(() => setCopied(false), 2000);
      } catch {
        toast.error('复制失败');
      }
    }
  };

  const id = `block-${Math.random().toString(36).slice(2, 9)}`;

  return (
    <div className="relative group/block" data-block-id={id}>
      {children}
      <button
        onClick={handleCopy}
        className="absolute top-1 right-1 p-1 rounded bg-muted/70 hover:bg-muted text-muted-foreground hover:text-foreground transition-all opacity-0 group-hover/block:opacity-100 z-10"
        title={`复制${label}`}
      >
        {copied ? <Check className="h-3 w-3 text-primary" /> : <ClipboardCopy className="h-3 w-3" />}
      </button>
    </div>
  );
}

export function MarkdownRenderer({ content, className = '', proseSize = 'prose-sm' }: MarkdownRendererProps) {
  /* ── Selection copy tooltip ── */
  const [tooltip, setTooltip] = useState<{ x: number; y: number; text: string } | null>(null);

  const handleMouseUp = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    const sel = window.getSelection();
    const text = sel?.toString().trim();
    if (text && text.length > 0) {
      const range = sel!.getRangeAt(0);
      const rect = range.getBoundingClientRect();
      const container = e.currentTarget.getBoundingClientRect();
      setTooltip({
        x: rect.left - container.left + rect.width / 2,
        y: rect.top - container.top - 8,
        text,
      });
    } else {
      setTooltip(null);
    }
  }, []);

  const handleCopySelection = async () => {
    if (!tooltip) return;
    try {
      await navigator.clipboard.writeText(tooltip.text);
      toast.success('已复制选中内容');
    } catch {
      toast.error('复制失败');
    }
    setTooltip(null);
    window.getSelection()?.removeAllRanges();
  };

  return (
    <div
      className={`prose ${proseSize} dark:prose-invert max-w-none relative ${className}`}
      onMouseUp={handleMouseUp}
      onMouseDown={() => setTooltip(null)}
    >
      {/* Selection copy tooltip */}
      {tooltip && (
        <button
          onClick={handleCopySelection}
          className="absolute z-50 flex items-center gap-1 px-2 py-1 rounded-md bg-popover border border-border shadow-lg text-xs text-popover-foreground hover:bg-accent transition-colors -translate-x-1/2 -translate-y-full"
          style={{ left: tooltip.x, top: tooltip.y }}
        >
          <Copy className="h-3 w-3" /> 复制
        </button>
      )}

      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        rehypePlugins={[rehypeRaw]}
        components={{
          pre({ children, ...props }) {
            // Extract raw code text from nested <code>
            let codeText = '';
            const extractText = (node: any): string => {
              if (typeof node === 'string') return node;
              if (node?.props?.children) {
                if (Array.isArray(node.props.children)) return node.props.children.map(extractText).join('');
                return extractText(node.props.children);
              }
              return '';
            };
            codeText = extractText(children);

            return (
              <div className="relative group not-prose">
                <pre {...props} className="rounded-lg bg-secondary dark:bg-[hsl(220,40%,13%)] p-4 overflow-x-auto text-sm border border-border">
                  {children}
                </pre>
                <CodeCopyButton code={codeText} />
              </div>
            );
          },
          blockquote({ children, ...props }) {
            return (
              <CopyableBlock label="引用">
                <blockquote {...props}>{children}</blockquote>
              </CopyableBlock>
            );
          },
          table({ children, ...props }) {
            return (
              <CopyableBlock label="表格">
                <table {...props}>{children}</table>
              </CopyableBlock>
            );
          },
        }}
      >
        {content}
      </ReactMarkdown>
    </div>
  );
}
