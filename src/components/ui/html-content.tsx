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
    ALLOWED_ATTR: ['style', 'class', 'colspan', 'rowspan']
  });

  return (
    <div 
      className={`prose prose-sm max-w-none ${className || ''}`}
      dangerouslySetInnerHTML={{ __html: sanitizedHtml }}
      style={{
        // Table styling
        '--tw-prose-th-borders': 'hsl(var(--border))',
        '--tw-prose-td-borders': 'hsl(var(--border))',
      } as React.CSSProperties}
    />
  );
};