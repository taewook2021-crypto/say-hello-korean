import React from 'react';
import DOMPurify from 'dompurify';

interface HtmlContentProps {
  content: string;
  className?: string;
}

export const HtmlContent: React.FC<HtmlContentProps> = ({ content, className }) => {
  const sanitizedHtml = DOMPurify.sanitize(content, {
    ALLOWED_TAGS: [
      'p', 'br', 'strong', 'em', 'b', 'i', 'u', 's', 'strike',
      'ul', 'ol', 'li', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6',
      'table', 'thead', 'tbody', 'tr', 'th', 'td', 'blockquote'
    ],
    ALLOWED_ATTR: ['style', 'class', 'colspan', 'rowspan'],
    ADD_ATTR: ['border'],
    FORBID_CONTENTS: []
  });

  return (
    <div 
      className={`prose prose-sm max-w-none ${className || ''} [&_table]:border-collapse [&_table]:border [&_table]:border-border [&_td]:border [&_td]:border-border [&_td]:p-2 [&_th]:border [&_th]:border-border [&_th]:p-2 [&_th]:bg-muted`}
      dangerouslySetInnerHTML={{ __html: sanitizedHtml }}
      style={{
        // Table styling
        '--tw-prose-th-borders': 'hsl(var(--border))',
        '--tw-prose-td-borders': 'hsl(var(--border))',
      } as React.CSSProperties}
    />
  );
};