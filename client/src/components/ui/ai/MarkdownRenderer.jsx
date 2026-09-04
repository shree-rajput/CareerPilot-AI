import React from 'react';
import { CodeRenderer } from './CodeRenderer';
import { TableRenderer } from './TableRenderer';

export function MarkdownRenderer({ content, className = '' }) {
  if (!content || typeof content !== 'string') return null;

  // Split into code blocks vs text blocks
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

  const renderInlineFormatted = (str) => {
    // Replace **bold** and `code`
    const parts = [];
    let currentStr = str;
    let keyIdx = 0;

    // Simple regex parser for bold and inline code
    const inlineRegex = /(\*\*.*?\*\*|`.*?`)/g;
    let inlineMatch;
    let idx = 0;

    while ((inlineMatch = inlineRegex.exec(str)) !== null) {
      if (inlineMatch.index > idx) {
        parts.push(<span key={keyIdx++}>{str.substring(idx, inlineMatch.index)}</span>);
      }
      const val = inlineMatch[0];
      if (val.startsWith('**') && val.endsWith('**')) {
        parts.push(<strong key={keyIdx++} className="font-bold text-text">{val.slice(2, -2)}</strong>);
      } else if (val.startsWith('`') && val.endsWith('`')) {
        parts.push(<code key={keyIdx++} className="px-1.5 py-0.5 rounded bg-bg-secondary text-primary text-xs font-mono">{val.slice(1, -1)}</code>);
      }
      idx = inlineRegex.lastIndex;
    }
    if (idx < str.length) {
      parts.push(<span key={keyIdx++}>{str.substring(idx)}</span>);
    }

    return parts.length > 0 ? parts : str;
  };

  const renderTextBlock = (textBlock, blockIdx) => {
    const lines = textBlock.split('\n');
    const renderedElements = [];
    let currentList = [];
    let tableLines = [];

    const flushList = () => {
      if (currentList.length > 0) {
        renderedElements.push(
          <ul key={`list-${renderedElements.length}`} className="my-2 space-y-1.5 list-disc list-inside text-text-secondary text-xs leading-relaxed">
            {currentList.map((item, i) => (
              <li key={i}>{renderInlineFormatted(item)}</li>
            ))}
          </ul>
        );
        currentList = [];
      }
    };

    const flushTable = () => {
      if (tableLines.length > 0) {
        const parsedRows = tableLines.map(line => line.split('|').map(c => c.trim()).filter(Boolean));
        if (parsedRows.length >= 2) {
          const headers = parsedRows[0];
          const dataRows = parsedRows.slice(2); // Skip header and separator line
          const formattedRows = dataRows.map(row => {
            const obj = {};
            headers.forEach((h, idx) => {
              obj[h] = row[idx] || '';
            });
            return obj;
          });
          renderedElements.push(<TableRenderer key={`table-${renderedElements.length}`} headers={headers} rows={formattedRows} />);
        }
        tableLines = [];
      }
    };

    lines.forEach((line, idx) => {
      const trimmed = line.trim();

      // Check if table row
      if (trimmed.startsWith('|') && trimmed.endsWith('|')) {
        flushList();
        tableLines.push(trimmed);
        return;
      } else {
        flushTable();
      }

      // Check bullet list
      if (trimmed.startsWith('- ') || trimmed.startsWith('* ')) {
        currentList.push(trimmed.slice(2));
        return;
      } else {
        flushList();
      }

      if (!trimmed) return;

      // Headers
      if (trimmed.startsWith('### ')) {
        renderedElements.push(<h4 key={idx} className="font-bold text-text text-xs mt-3 mb-1 uppercase tracking-wider">{renderInlineFormatted(trimmed.slice(4))}</h4>);
      } else if (trimmed.startsWith('## ')) {
        renderedElements.push(<h3 key={idx} className="font-bold text-text text-sm mt-4 mb-2">{renderInlineFormatted(trimmed.slice(3))}</h3>);
      } else if (trimmed.startsWith('# ')) {
        renderedElements.push(<h2 key={idx} className="font-bold text-text text-base mt-4 mb-2">{renderInlineFormatted(trimmed.slice(2))}</h2>);
      } else {
        renderedElements.push(<p key={idx} className="my-1 text-xs text-text-secondary leading-relaxed">{renderInlineFormatted(trimmed)}</p>);
      }
    });

    flushList();
    flushTable();

    return <div key={blockIdx} className="space-y-1">{renderedElements}</div>;
  };

  return (
    <div className={`space-y-2 text-text text-xs leading-relaxed ${className}`}>
      {blocks.map((block, idx) =>
        block.type === 'code' ? (
          <CodeRenderer key={idx} code={block.code} language={block.language} />
        ) : (
          renderTextBlock(block.text, idx)
        )
      )}
    </div>
  );
}
