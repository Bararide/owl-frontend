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

export const MarkdownRenderer: React.FC<MarkdownRendererProps> = ({ content }) => {
  const theme = useTheme();
  const isDark = theme.palette.mode === 'dark';

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
        {content}
      </ReactMarkdown>
    </Paper>
  );
};