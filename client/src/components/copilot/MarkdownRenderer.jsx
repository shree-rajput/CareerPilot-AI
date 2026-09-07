import React from 'react';
import { CodeBlockComponent } from './CodeBlockComponent';

export function MarkdownRenderer({ content = '', className = '' }) {
  if (!content || typeof content !== 'string') return null;

  // 1. Separate code blocks from normal text
  const codeBlockRegex = /```(\w*)\n([\s\S]*?)```/g;
  const blocks = [];
  let lastIndex = 0;
  let match;

  while ((match = codeBlockRegex.exec(content)) !== null) {
    if (match.index > lastIndex) {
      blocks.push({ type: 'text', text: content.substring(lastIndex, match.index) });
    }
    blocks.push({ type: 'code', language: match[1] || 'javascript', code: match[2].trim() });
    lastIndex = codeBlockRegex.lastIndex;
  }

  if (lastIndex < content.length) {
    blocks.push({ type: 'text', text: content.substring(lastIndex) });
  }

  // 2. Inline Markdown Parser (Bold, Italic, Code, Links)
  const renderInline = (str) => {
    if (!str) return null;
    const parts = [];
    let idx = 0;
    let keyIdx = 0;

    // Pattern matches **bold**, *italic*, `code`, and [link](url)
    const inlineRegex = /(\*\*.*?\*\*|\*.*?\*|`.*?`|\[.*?\]\(.*?\))/g;
    let inlineMatch;

    while ((inlineMatch = inlineRegex.exec(str)) !== null) {
      if (inlineMatch.index > idx) {
        parts.push(<span key={keyIdx++}>{str.substring(idx, inlineMatch.index)}</span>);
      }
      const val = inlineMatch[0];

      if (val.startsWith('**') && val.endsWith('**')) {
        parts.push(<strong key={keyIdx++} className="font-bold text-text">{val.slice(2, -2)}</strong>);
      } else if (val.startsWith('*') && val.endsWith('*') && !val.startsWith('**')) {
        parts.push(<em key={keyIdx++} className="italic text-text-secondary">{val.slice(1, -1)}</em>);
      } else if (val.startsWith('`') && val.endsWith('`')) {
        parts.push(<code key={keyIdx++} className="px-1.5 py-0.5 rounded bg-bg-secondary border border-border text-primary text-[11px] font-mono">{val.slice(1, -1)}</code>);
      } else if (val.startsWith('[') && val.includes('](') && val.endsWith(')')) {
        const linkMatch = /\[(.*?)\]\((.*?)\)/.exec(val);
        if (linkMatch) {
          parts.push(
            <a
              key={keyIdx++}
              href={linkMatch[2]}
              target="_blank"
              rel="noopener noreferrer"
              className="text-primary hover:underline font-medium inline-flex items-center gap-0.5"
            >
              {linkMatch[1]}
            </a>
          );
        }
      }
      idx = inlineRegex.lastIndex;
    }

    if (idx < str.length) {
      parts.push(<span key={keyIdx++}>{str.substring(idx)}</span>);
    }

    return parts.length > 0 ? parts : str;
  };

  // 3. Block Markdown Parser (Headers, Lists, Blockquotes, Paragraphs)
  const renderTextBlock = (textBlock, blockIdx) => {
    const lines = textBlock.split('\n');
    const elements = [];

    let currentBulletList = [];
    let currentNumberedList = [];
    let tableLines = [];

    const flushBulletList = () => {
      if (currentBulletList.length > 0) {
        elements.push(
          <ul key={`ul-${elements.length}`} className="my-2 space-y-1.5 list-disc list-inside text-text-secondary text-xs leading-relaxed">
            {currentBulletList.map((item, i) => (
              <li key={i}>{renderInline(item)}</li>
            ))}
          </ul>
        );
        currentBulletList = [];
      }
    };

    const flushNumberedList = () => {
      if (currentNumberedList.length > 0) {
        elements.push(
          <ol key={`ol-${elements.length}`} className="my-2 space-y-1.5 list-decimal list-inside text-text-secondary text-xs leading-relaxed">
            {currentNumberedList.map((item, i) => (
              <li key={i}>{renderInline(item)}</li>
            ))}
          </ol>
        );
        currentNumberedList = [];
      }
    };

    const flushTable = () => {
      if (tableLines.length > 0) {
        const parsedRows = tableLines.map(l => l.split('|').map(c => c.trim()).filter(Boolean));
        if (parsedRows.length >= 2) {
          const headers = parsedRows[0];
          const dataRows = parsedRows.slice(2);
          elements.push(
            <div key={`table-${elements.length}`} className="my-3 overflow-x-auto rounded-xl border border-border">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="bg-bg-secondary border-b border-border text-text font-bold">
                    {headers.map((h, i) => (
                      <th key={i} className="p-2.5">{renderInline(h)}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {dataRows.map((row, rIdx) => (
                    <tr key={rIdx} className="border-b border-border/50 hover:bg-bg-secondary/40">
                      {row.map((cell, cIdx) => (
                        <td key={cIdx} className="p-2.5 text-text-secondary">{renderInline(cell)}</td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          );
        }
        tableLines = [];
      }
    };

    lines.forEach((line, idx) => {
      const trimmed = line.trim();

      // Table row check
      if (trimmed.startsWith('|') && trimmed.endsWith('|')) {
        flushBulletList();
        flushNumberedList();
        tableLines.push(trimmed);
        return;
      } else {
        flushTable();
      }

      // Bullet list check (- or * )
      if (trimmed.startsWith('- ') || trimmed.startsWith('* ')) {
        flushNumberedList();
        currentBulletList.push(trimmed.slice(2));
        return;
      } else {
        flushBulletList();
      }

      // Numbered list check (1. 2. etc)
      const numMatch = /^\d+\.\s+(.*)/.exec(trimmed);
      if (numMatch) {
        flushBulletList();
        currentNumberedList.push(numMatch[1]);
        return;
      } else {
        flushNumberedList();
      }

      if (!trimmed) return;

      // Blockquote check
      if (trimmed.startsWith('> ')) {
        elements.push(
          <blockquote key={idx} className="my-2 border-l-3 border-primary/60 pl-3 italic text-text-secondary text-xs">
            {renderInline(trimmed.slice(2))}
          </blockquote>
        );
        return;
      }

      // Headings
      if (trimmed.startsWith('### ')) {
        elements.push(<h4 key={idx} className="font-bold text-text text-xs mt-3 mb-1.5 uppercase tracking-wider">{renderInline(trimmed.slice(4))}</h4>);
      } else if (trimmed.startsWith('## ')) {
        elements.push(<h3 key={idx} className="font-bold text-text text-sm mt-4 mb-2">{renderInline(trimmed.slice(3))}</h3>);
      } else if (trimmed.startsWith('# ')) {
        elements.push(<h2 key={idx} className="font-bold text-text text-base mt-4 mb-2">{renderInline(trimmed.slice(2))}</h2>);
      } else {
        elements.push(<p key={idx} className="my-1.5 text-xs text-text-secondary leading-relaxed">{renderInline(trimmed)}</p>);
      }
    });

    flushBulletList();
    flushNumberedList();
    flushTable();

    return <div key={blockIdx} className="space-y-1">{elements}</div>;
  };

  return (
    <div className={`space-y-2 text-text text-xs leading-relaxed ${className}`}>
      {blocks.map((block, idx) =>
        block.type === 'code' ? (
          <CodeBlockComponent key={idx} code={block.code} language={block.language} />
        ) : (
          renderTextBlock(block.text, idx)
        )
      )}
    </div>
  );
}
