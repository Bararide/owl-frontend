import React from 'react';
import ReactMarkdown from 'react-markdown';
import remarkMath from 'remark-math';
import rehypeKatex from 'rehype-katex';
import rehypeHighlight from 'rehype-highlight';
import { Box, Paper, useTheme } from '@mui/material';
import 'katex/dist/katex.min.css';
import 'highlight.js/styles/github-dark.css';

interface MarkdownRendererProps {
  content: string;
}

const fixCodeBlocks = (content: string): string => {
  const lines = content.split('\n');
  const result = [];
  let inCodeBlock = false;
  
  for (let i = 0; i < lines.length; i++) {
    let line = lines[i];
    
    if (line.match(/^```[^\s`]/)) {
      const backticks = '```';
      const restText = line.substring(3);
      
      if (inCodeBlock) {
        result.push(backticks);
        inCodeBlock = false;
        result.push(restText);
      } else {
        result.push(backticks);
        result.push(backticks);
        inCodeBlock = false;
        result.push(restText);
      }
    } 
    else if (line.startsWith('```') && line.length > 3) {
      const backticks = '```';
      const lang = line.substring(3).trim();
      if (lang) {
        result.push(`${backticks}${lang}`);
      } else {
        result.push(backticks);
      }
      inCodeBlock = !inCodeBlock;
    }
    else if (line.startsWith('```')) {
      result.push(line);
      inCodeBlock = !inCodeBlock;
    }
    else {
      result.push(line);
    }
  }
  
  return result.join('\n');
};

const wrapCodeInMarkdown = (content: string): string => {
  let fixed = content.replace(/^```(\S+)/gm, (match, p1) => {
    if (p1.length > 0 && !['cpp', 'c++', 'python', 'javascript', 'typescript', 'java', 'go', 'rust'].includes(p1.toLowerCase())) {
      return `\`\`\`\n\`\`\`\n${p1}`;
    }
    return match;
  });
  
  return fixed;
};

export const MarkdownRenderer: React.FC<MarkdownRendererProps> = ({ content }) => {
  const theme = useTheme();
  const isDark = theme.palette.mode === 'dark';
  
  const safeContent = React.useMemo(() => {
    let processed = fixCodeBlocks(content);
    processed = wrapCodeInMarkdown(processed);
    return processed;
  }, [content]);

  return (
    <Paper
      elevation={0}
      sx={{
        height: '100%',
        overflow: 'auto',
        p: 3,
        background: 'rgba(0,0,0,0.3)',
        border: '1px solid rgba(255,255,255,0.1)',
        borderRadius: 2,
        '& .katex': {
          fontSize: '1.1em',
        },
        '& .katex-display': {
          margin: '1em 0',
          overflow: 'auto hidden',
        },
        '& pre': {
          backgroundColor: isDark ? '#1e1e1e' : '#f6f8fa',
          borderRadius: '8px',
          padding: '16px',
          overflow: 'auto',
        },
        '& code': {
          fontFamily: '"Fira Code", monospace',
          fontSize: '0.875rem',
        },
        '& table': {
          borderCollapse: 'collapse',
          width: '100%',
          margin: '1em 0',
        },
        '& th, & td': {
          border: '1px solid rgba(255,255,255,0.2)',
          padding: '8px 12px',
          textAlign: 'left',
        },
        '& th': {
          backgroundColor: 'rgba(255,255,255,0.05)',
        },
      }}
    >
      <ReactMarkdown
        remarkPlugins={[remarkMath]}
        rehypePlugins={[
          rehypeKatex,
          [rehypeHighlight, { ignoreMissing: true }]
        ]}
      >
        {safeContent}
      </ReactMarkdown>
    </Paper>
  );
};