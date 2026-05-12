const splitInlineTokens = (text) => {
  const tokens = [];
  const pattern = /(\[[^\]]+\]\(https?:\/\/[^\s)]+\)|`[^`]+`|\*\*[^*]+\*\*|\*[^*]+\*)/g;
  let lastIndex = 0;
  let match;

  while ((match = pattern.exec(text)) !== null) {
    if (match.index > lastIndex) {
      tokens.push({ type: 'text', value: text.slice(lastIndex, match.index) });
    }

    const value = match[0];
    if (value.startsWith('[')) {
      const linkMatch = value.match(/^\[([^\]]+)\]\((https?:\/\/[^\s)]+)\)$/);
      tokens.push({ type: 'link', label: linkMatch?.[1] || value, href: linkMatch?.[2] || '#' });
    } else if (value.startsWith('`')) {
      tokens.push({ type: 'code', value: value.slice(1, -1) });
    } else if (value.startsWith('**')) {
      tokens.push({ type: 'strong', value: value.slice(2, -2) });
    } else {
      tokens.push({ type: 'em', value: value.slice(1, -1) });
    }
    lastIndex = pattern.lastIndex;
  }

  if (lastIndex < text.length) {
    tokens.push({ type: 'text', value: text.slice(lastIndex) });
  }

  return tokens;
};

const renderInline = (text, keyPrefix) => {
  return splitInlineTokens(text).map((token, index) => {
    const key = `${keyPrefix}-${index}`;
    if (token.type === 'code') return <code key={key}>{token.value}</code>;
    if (token.type === 'strong') return <strong key={key}>{token.value}</strong>;
    if (token.type === 'em') return <em key={key}>{token.value}</em>;
    if (token.type === 'link') {
      return (
        <a key={key} href={token.href} target="_blank" rel="noreferrer">
          {token.label}
        </a>
      );
    }
    return <span key={key}>{token.value}</span>;
  });
};

const isTableDivider = (line) => {
  const cleaned = line.trim().replace(/^\|/, '').replace(/\|$/, '');
  if (!cleaned.includes('|')) return false;
  return cleaned.split('|').every((cell) => /^:?-{3,}:?$/.test(cell.trim()));
};

const splitTableRow = (line) => {
  return line.trim().replace(/^\|/, '').replace(/\|$/, '').split('|').map((cell) => cell.trim());
};

const parseBlocks = (text) => {
  const lines = String(text || '').replace(/\r\n/g, '\n').split('\n');
  const blocks = [];
  let index = 0;

  while (index < lines.length) {
    const line = lines[index];

    if (!line.trim()) {
      index += 1;
      continue;
    }

    if (line.trim().startsWith('```')) {
      const codeLines = [];
      index += 1;
      while (index < lines.length && !lines[index].trim().startsWith('```')) {
        codeLines.push(lines[index]);
        index += 1;
      }
      if (index < lines.length) index += 1;
      blocks.push({ type: 'code', value: codeLines.join('\n') });
      continue;
    }

    if (/^\s*#{1,3}\s+/.test(line)) {
      const marker = line.trim().match(/^(#{1,3})\s+/)?.[1] || '###';
      blocks.push({
        type: 'heading',
        level: marker.length,
        value: line.trim().replace(/^#{1,3}\s+/, ''),
      });
      index += 1;
      continue;
    }

    if (line.includes('|') && lines[index + 1] && isTableDivider(lines[index + 1])) {
      const headers = splitTableRow(line);
      index += 2;
      const rows = [];
      while (index < lines.length && lines[index].includes('|') && lines[index].trim()) {
        rows.push(splitTableRow(lines[index]));
        index += 1;
      }
      blocks.push({ type: 'table', headers, rows });
      continue;
    }

    if (/^\s*[-*]\s+/.test(line)) {
      const items = [];
      while (index < lines.length && /^\s*[-*]\s+/.test(lines[index])) {
        items.push(lines[index].replace(/^\s*[-*]\s+/, '').trim());
        index += 1;
      }
      blocks.push({ type: 'ul', items });
      continue;
    }

    if (/^\s*\d+\.\s+/.test(line)) {
      const items = [];
      while (index < lines.length && /^\s*\d+\.\s+/.test(lines[index])) {
        items.push(lines[index].replace(/^\s*\d+\.\s+/, '').trim());
        index += 1;
      }
      blocks.push({ type: 'ol', items });
      continue;
    }

    if (/^\s*>\s+/.test(line)) {
      const quotes = [];
      while (index < lines.length && /^\s*>\s+/.test(lines[index])) {
        quotes.push(lines[index].replace(/^\s*>\s+/, '').trim());
        index += 1;
      }
      blocks.push({ type: 'quote', value: quotes.join(' ') });
      continue;
    }

    const paragraphLines = [];
    while (
      index < lines.length &&
      lines[index].trim() &&
      !lines[index].trim().startsWith('```') &&
      !/^\s*#{1,3}\s+/.test(lines[index]) &&
      !/^\s*[-*]\s+/.test(lines[index]) &&
      !/^\s*\d+\.\s+/.test(lines[index]) &&
      !/^\s*>\s+/.test(lines[index]) &&
      !(lines[index].includes('|') && lines[index + 1] && isTableDivider(lines[index + 1]))
    ) {
      paragraphLines.push(lines[index].trim());
      index += 1;
    }
    blocks.push({ type: 'p', value: paragraphLines.join(' ') });
  }

  return blocks;
};

const MarkdownMessage = ({ text }) => {
  const blocks = parseBlocks(text);

  return (
    <div className="markdown-message">
      {blocks.map((block, index) => {
        if (block.type === 'code') {
          return (
            <pre key={index}>
              <code>{block.value}</code>
            </pre>
          );
        }

        if (block.type === 'heading') {
          const Tag = `h${Math.min(block.level + 2, 4)}`;
          return <Tag key={index}>{renderInline(block.value, `${index}`)}</Tag>;
        }

        if (block.type === 'ul') {
          return (
            <ul key={index}>
              {block.items.map((item, itemIndex) => (
                <li key={itemIndex}>{renderInline(item, `${index}-${itemIndex}`)}</li>
              ))}
            </ul>
          );
        }

        if (block.type === 'ol') {
          return (
            <ol key={index}>
              {block.items.map((item, itemIndex) => (
                <li key={itemIndex}>{renderInline(item, `${index}-${itemIndex}`)}</li>
              ))}
            </ol>
          );
        }

        if (block.type === 'quote') {
          return <blockquote key={index}>{renderInline(block.value, `${index}`)}</blockquote>;
        }

        if (block.type === 'table') {
          return (
            <div className="markdown-table-wrap" key={index}>
              <table>
                <thead>
                  <tr>
                    {block.headers.map((header, cellIndex) => (
                      <th key={cellIndex}>{renderInline(header, `${index}-h-${cellIndex}`)}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {block.rows.map((row, rowIndex) => (
                    <tr key={rowIndex}>
                      {block.headers.map((header, cellIndex) => (
                        <td key={cellIndex} data-label={header}>{renderInline(row[cellIndex] || '', `${index}-${rowIndex}-${cellIndex}`)}</td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          );
        }

        return <p key={index}>{renderInline(block.value, `${index}`)}</p>;
      })}
    </div>
  );
};

export default MarkdownMessage;
