import React, { useState, useRef, useEffect } from 'react';
import {
  Box,
  Typography,
  Paper,
  TextField,
  IconButton,
  Button,
  Divider,
  Chip,
  CircularProgress,
  Alert,
  Grid,
  Card,
  CardContent,
  Tooltip,
  alpha,
} from '@mui/material';
import {
  Send as SendIcon,
  Search as SearchIcon,
  Folder as FolderIcon,
  Description as DescriptionIcon,
  Code as CodeIcon,
  Image as ImageIcon,
  Download as DownloadIcon,
  Visibility as ViewIcon,
} from '@mui/icons-material';
import { motion, AnimatePresence } from 'framer-motion';
import { Container, ApiFile, SearchResult } from '../api/client';
import { useSemanticSearch, useFiles, useDownloadFile, useFileContent } from '../hooks/useApi';
import { FileCard } from '../components/files/FileCard';
import { useNotifications } from '../hooks/useNotifications';

interface SearchViewProps {
  selectedContainer: Container | null;
  onContainerSelect: (container: Container) => void;
}

interface Message {
  id: string;
  type: 'user' | 'assistant';
  content: string;
  timestamp: Date;
  files?: Array<{
    file: ApiFile;
    score: number;
    content_preview: string;
  }>;
}

export const SearchView: React.FC<SearchViewProps> = ({
  selectedContainer,
  onContainerSelect,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [messages, setMessages] = useState<Message[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const { addNotification } = useNotifications();

  const semanticSearchMutation = useSemanticSearch();
  const { data: files = [] } = useFiles(selectedContainer?.id);
  const downloadFileMutation = useDownloadFile();
  const fileContentQuery = useFileContent(selectedContainer?.id || '', '');

  // Авто-скролл к новым сообщениям
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSearch = async () => {
    if (!searchQuery.trim() || !selectedContainer) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      type: 'user',
      content: searchQuery,
      timestamp: new Date(),
    };

    setMessages(prev => [...prev, userMessage]);
    setIsLoading(true);

    try {
      const searchResult = await semanticSearchMutation.mutateAsync({
        query: searchQuery,
        container_id: selectedContainer.id,
        limit: 5,
      });

      const assistantMessage: Message = {
        id: (Date.now() + 1).toString(),
        type: 'assistant',
        content: `I found ${searchResult.results.length} relevant files for your query: "${searchQuery}"`,
        timestamp: new Date(),
        files: searchResult.results.map(result => ({
          file: files.find(f => f.path === result.path) || {
            path: result.path,
            name: result.path.split('/').pop() || result.path,
            size: 0,
            container_id: selectedContainer.id,
            user_id: '',
            created_at: new Date().toISOString(),
            mime_type: 'text/plain',
          },
          score: result.score,
          content_preview: result.content_preview,
        })),
      };

      setMessages(prev => [...prev, assistantMessage]);
      setSearchQuery('');
    } catch (error) {
      addNotification({
        message: `Search failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
        severity: 'error',
        open: true,
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSearch();
    }
  };

  const handleFileAction = async (action: string, file: ApiFile) => {
    switch (action) {
      case 'download':
        try {
          const blob = await downloadFileMutation.mutateAsync({
            container_id: file.container_id,
            file: file,
          });
          
          const url = window.URL.createObjectURL(blob);
          const a = document.createElement('a');
          a.href = url;
          a.download = file.name;
          document.body.appendChild(a);
          a.click();
          window.URL.revokeObjectURL(url);
          document.body.removeChild(a);
          
          addNotification({
            message: `File "${file.name}" downloaded successfully`,
            severity: 'success',
            open: true,
          });
        } catch (error) {
          addNotification({
            message: `Download failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
            severity: 'error',
            open: true,
          });
        }
        break;
      
      case 'view':
        addNotification({
          message: `Viewing file: ${file.name}`,
          severity: 'info',
          open: true,
        });
        break;
      
      default:
        console.log(`Action ${action} on file ${file.name}`);
    }
  };

  const handleViewContent = (file: ApiFile) => {
    addNotification({
      message: `Opening file content: ${file.name}`,
      severity: 'info',
      open: true,
    });
  };

  const getFileIcon = (fileName: string) => {
    const extension = fileName.split('.').pop()?.toLowerCase();
    switch (extension) {
      case 'py':
      case 'js':
      case 'ts':
      case 'java':
      case 'cpp':
      case 'c':
      case 'html':
      case 'css':
        return <CodeIcon />;
      case 'png':
      case 'jpg':
      case 'jpeg':
      case 'gif':
      case 'svg':
        return <ImageIcon />;
      case 'pdf':
        return <DescriptionIcon color="error" />;
      default:
        return <DescriptionIcon />;
    }
  };

  const formatScore = (score: number) => {
    return (score * 100).toFixed(1);
  };

  if (!selectedContainer) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '50vh' }}>
        <Alert severity="info" sx={{ maxWidth: 400 }}>
          Please select a container first to use semantic search
        </Alert>
      </Box>
    );
  }

  return (
    <Box sx={{ height: 'calc(100vh - 200px)', display: 'flex', flexDirection: 'column' }}>
      {/* Header */}
      <Box sx={{ mb: 3 }}>
        <Typography variant="h4" gutterBottom sx={{ fontWeight: 700 }}>
          Semantic Search
        </Typography>
        <Typography variant="body1" color="text.secondary">
          Ask questions about your container files and get AI-powered answers
        </Typography>
        <Chip 
          label={`Container: ${selectedContainer.id.substring(0, 12)}...`}
          color="primary"
          variant="outlined"
          sx={{ mt: 1 }}
        />
      </Box>

      <Grid container spacing={3} sx={{ flex: 1, minHeight: 0 }}>
        {/* Чат-панель */}
        <Grid>
          <Paper 
            sx={{ 
              height: '100%', 
              display: 'flex', 
              flexDirection: 'column',
              background: 'linear-gradient(135deg, rgba(26, 31, 54, 0.8) 0%, rgba(26, 31, 54, 0.6) 100%)',
              border: '1px solid rgba(255, 255, 255, 0.08)',
            }}
          >
            {/* Сообщения */}
            <Box sx={{ flex: 1, p: 2, overflow: 'auto' }}>
              <AnimatePresence>
                {messages.length === 0 ? (
                  <Box sx={{ 
                    display: 'flex', 
                    flexDirection: 'column', 
                    alignItems: 'center', 
                    justifyContent: 'center',
                    height: '100%',
                    color: 'text.secondary',
                    textAlign: 'center'
                  }}>
                    <SearchIcon sx={{ fontSize: 64, mb: 2, opacity: 0.5 }} />
                    <Typography variant="h6" gutterBottom>
                      Ask questions about your files
                    </Typography>
                    <Typography variant="body2">
                      The AI will search through your container files and provide relevant answers
                    </Typography>
                  </Box>
                ) : (
                  messages.map((message) => (
                    <motion.div
                      key={message.id}
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -20 }}
                    >
                      <Box sx={{ mb: 3 }}>
                        {/* Сообщение пользователя */}
                        {message.type === 'user' && (
                          <Box sx={{ display: 'flex', justifyContent: 'flex-end', mb: 2 }}>
                            <Paper
                              sx={{
                                p: 2,
                                maxWidth: '70%',
                                background: 'linear-gradient(135deg, #7367F0 0%, #CE9FFC 100%)',
                                color: 'white',
                              }}
                            >
                              <Typography variant="body1">{message.content}</Typography>
                            </Paper>
                          </Box>
                        )}

                        {/* Сообщение ассистента */}
                        {message.type === 'assistant' && (
                          <Box sx={{ display: 'flex', justifyContent: 'flex-start' }}>
                            <Box sx={{ maxWidth: '90%' }}>
                              <Paper
                                sx={{
                                  p: 2,
                                  background: 'rgba(255, 255, 255, 0.05)',
                                  border: '1px solid rgba(255, 255, 255, 0.08)',
                                }}
                              >
                                <Typography variant="body1" sx={{ mb: message.files ? 2 : 0 }}>
                                  {message.content}
                                </Typography>

                                {/* Файлы с релевантностью */}
                                {message.files && message.files.length > 0 && (
                                  <Box sx={{ mt: 2 }}>
                                    <Typography variant="subtitle2" gutterBottom sx={{ opacity: 0.8 }}>
                                      Relevant files:
                                    </Typography>
                                    {message.files.map((fileInfo, index) => (
                                      <Card
                                        key={index}
                                        sx={{
                                          mb: 1,
                                          background: 'rgba(255, 255, 255, 0.02)',
                                          border: '1px solid rgba(255, 255, 255, 0.04)',
                                          cursor: 'pointer',
                                          '&:hover': {
                                            background: 'rgba(255, 255, 255, 0.05)',
                                          },
                                        }}
                                        onClick={() => handleFileAction('view', fileInfo.file)}
                                      >
                                        <CardContent sx={{ p: 1.5, '&:last-child': { pb: 1.5 } }}>
                                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                                            <Box
                                              sx={{
                                                p: 1,
                                                borderRadius: 1,
                                                backgroundColor: (theme) => alpha(theme.palette.primary.main, 0.1),
                                                display: 'flex',
                                                alignItems: 'center',
                                              }}
                                            >
                                              {getFileIcon(fileInfo.file.name)}
                                            </Box>
                                            <Box sx={{ flex: 1, minWidth: 0 }}>
                                              <Typography variant="body2" noWrap fontWeight={600}>
                                                {fileInfo.file.name}
                                              </Typography>
                                              <Typography variant="caption" color="text.secondary" noWrap>
                                                {fileInfo.file.path}
                                              </Typography>
                                            </Box>
                                            <Chip
                                              label={`${formatScore(fileInfo.score)}% match`}
                                              size="small"
                                              color="success"
                                              variant="outlined"
                                            />
                                          </Box>
                                          
                                          {/* Превью контента */}
                                          {fileInfo.content_preview && (
                                            <Typography
                                              variant="caption"
                                              sx={{
                                                display: 'block',
                                                mt: 1,
                                                p: 1,
                                                background: 'rgba(0, 0, 0, 0.2)',
                                                borderRadius: 1,
                                                fontFamily: 'monospace',
                                                fontSize: '0.7rem',
                                                lineHeight: 1.2,
                                              }}
                                            >
                                              {fileInfo.content_preview}
                                            </Typography>
                                          )}
                                        </CardContent>
                                      </Card>
                                    ))}
                                  </Box>
                                )}
                              </Paper>
                              <Typography variant="caption" color="text.secondary" sx={{ mt: 0.5, display: 'block' }}>
                                {message.timestamp.toLocaleTimeString()}
                              </Typography>
                            </Box>
                          </Box>
                        )}
                      </Box>
                    </motion.div>
                  ))
                )}
              </AnimatePresence>
              
              {/* Индикатор загрузки */}
              {isLoading && (
                <Box sx={{ display: 'flex', justifyContent: 'flex-start', mb: 2 }}>
                  <Paper
                    sx={{
                      p: 2,
                      background: 'rgba(255, 255, 255, 0.05)',
                      border: '1px solid rgba(255, 255, 255, 0.08)',
                    }}
                  >
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      <CircularProgress size={16} />
                      <Typography variant="body2">Searching through files...</Typography>
                    </Box>
                  </Paper>
                </Box>
              )}
              
              <div ref={messagesEndRef} />
            </Box>

            {/* Поле ввода */}
            <Box sx={{ p: 2, borderTop: '1px solid rgba(255, 255, 255, 0.08)' }}>
              <Box sx={{ display: 'flex', gap: 1 }}>
                <TextField
                  fullWidth
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  onKeyPress={handleKeyPress}
                  placeholder="Ask a question about your files..."
                  disabled={isLoading}
                  multiline
                  maxRows={3}
                  sx={{
                    '& .MuiOutlinedInput-root': {
                      background: 'rgba(255, 255, 255, 0.02)',
                      '&:hover': {
                        background: 'rgba(255, 255, 255, 0.04)',
                      },
                    },
                  }}
                />
                <Button
                  variant="contained"
                  onClick={handleSearch}
                  disabled={!searchQuery.trim() || isLoading || !selectedContainer}
                  sx={{ minWidth: 'auto', px: 2 }}
                >
                  {isLoading ? <CircularProgress size={24} /> : <SendIcon />}
                </Button>
              </Box>
              <Typography variant="caption" color="text.secondary" sx={{ mt: 1, display: 'block' }}>
                Press Enter to send, Shift+Enter for new line
              </Typography>
            </Box>
          </Paper>
        </Grid>

        {/* Панель файлов */}
        <Grid>
          <Paper 
            sx={{ 
              height: '100%',
              display: 'flex',
              flexDirection: 'column',
              background: 'linear-gradient(135deg, rgba(26, 31, 54, 0.8) 0%, rgba(26, 31, 54, 0.6) 100%)',
              border: '1px solid rgba(255, 255, 255, 0.08)',
            }}
          >
            <Box sx={{ p: 2, borderBottom: '1px solid rgba(255, 255, 255, 0.08)' }}>
              <Typography variant="h6" sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <FolderIcon />
                Container Files
              </Typography>
              <Typography variant="caption" color="text.secondary">
                {files.length} files available for search
              </Typography>
            </Box>

            <Box sx={{ flex: 1, p: 2, overflow: 'auto' }}>
              {files.length === 0 ? (
                <Box sx={{ textAlign: 'center', color: 'text.secondary', py: 4 }}>
                  <DescriptionIcon sx={{ fontSize: 48, mb: 1, opacity: 0.5 }} />
                  <Typography variant="body2">No files in container</Typography>
                </Box>
              ) : (
                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                  {files.slice(0, 10).map((file, index) => (
                    <motion.div
                      key={file.path}
                      initial={{ opacity: 0, x: 20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: index * 0.1 }}
                    >
                      <FileCard
                        file={file}
                        onSelect={() => handleFileAction('view', file)}
                        onAction={handleFileAction}
                        onViewContent={handleViewContent}
                      />
                    </motion.div>
                  ))}
                  {files.length > 10 && (
                    <Typography variant="caption" color="text.secondary" sx={{ textAlign: 'center', mt: 1 }}>
                      ...and {files.length - 10} more files
                    </Typography>
                  )}
                </Box>
              )}
            </Box>
          </Paper>
        </Grid>
      </Grid>
    </Box>
  );
};