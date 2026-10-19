import React from 'react';
import katex from 'katex';

interface MathRendererProps {
  content: string;
  className?: string;
}

/**
 * Parses content and renders both plain text and KaTeX math formulas.
 * Supports inline formulas with $...$ and block formulas with $$...$$.
 */
export const MathRenderer: React.FC<MathRendererProps> = ({ content, className = '' }) => {
  if (!content) return null;

  // Split content by $$ (block math) and $ (inline math)
  // Regex matches $$...$$ or $...$
  const regex = /(\$\$[\s\S]*?\$\$|\$[^\$\n]+?\$)/g;
  const parts = content.split(regex);

  return (
    <span className={`inline-block leading-relaxed ${className}`}>
      {parts.map((part, index) => {
        if (part.startsWith('$$') && part.endsWith('$$')) {
          const formula = part.slice(2, -2).trim();
          try {
            const html = katex.renderToString(formula, { displayMode: true, throwOnError: false });
            return (
              <span
                key={index}
                className="my-2 block overflow-x-auto py-1"
                dangerouslySetInnerHTML={{ __html: html }}
              />
            );
          } catch {
            return <code key={index} className="text-red-500 font-mono text-sm">{part}</code>;
          }
        } else if (part.startsWith('$') && part.endsWith('$')) {
          const formula = part.slice(1, -1).trim();
          try {
            const html = katex.renderToString(formula, { displayMode: false, throwOnError: false });
            return (
              <span
                key={index}
                className="inline-block px-0.5"
                dangerouslySetInnerHTML={{ __html: html }}
              />
            );
          } catch {
            return <code key={index} className="text-red-500 font-mono text-sm">{part}</code>;
          }
        }

        return <React.Fragment key={index}>{part}</React.Fragment>;
      })}
    </span>
  );
};

export default MathRenderer;
