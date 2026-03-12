import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

interface MarkdownRendererProps {
  content: string;
  className?: string;
  /** Override the default prose size class (e.g. 'prose-base', 'prose-lg') */
  proseSize?: string;
}

export function MarkdownRenderer({ content, className = '', proseSize = 'prose-sm' }: MarkdownRendererProps) {
  return (
    <div className={`prose ${proseSize} dark:prose-invert max-w-none ${className}`}>
      <ReactMarkdown remarkPlugins={[remarkGfm]}>{content}</ReactMarkdown>
    </div>
  );
}
