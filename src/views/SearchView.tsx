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
  SmartToy as BotIcon,
} from '@mui/icons-material';
import { motion, AnimatePresence } from 'framer-motion';
import { Container, ApiFile } from '../api/client';
import { useChatWithBot, useFiles, useDownloadFile, useFileContent } from '../hooks/useApi';
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
  used_files?: Array<{
    file_path: string;
    file_name: string;
    relevance_score: number;
    content_snippet: string;
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

  const chatWithBotMutation = useChatWithBot();
  const { data: files = [] } = useFiles(selectedContainer?.id);
  const downloadFileMutation = useDownloadFile();

  // Авто-скролл к новым сообщениям
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSendMessage = async () => {
    if (!searchQuery.trim() || !selectedContainer) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      type: 'user',
      content: searchQuery,
      timestamp: new Date(),
    };

    setMessages(prev => [...prev, userMessage]);
    setIsLoading(true);
    const currentQuery = searchQuery;
    setSearchQuery('');

    try {
      // Подготавливаем историю сообщений для API
      const conversationHistory = messages
        .filter(msg => msg.type === 'user' || msg.type === 'assistant')
        .map(msg => ({
          role: msg.type as 'user' | 'assistant',
          content: msg.content,
        }));

      const response = await chatWithBotMutation.mutateAsync({
        query: currentQuery,
        container_id: selectedContainer.id,
        conversation_history: conversationHistory,
      });

      const assistantMessage: Message = {
        id: (Date.now() + 1).toString(),
        type: 'assistant',
        content: response.answer,
        timestamp: new Date(),
        used_files: response.used_files,
      };

      setMessages(prev => [...prev, assistantMessage]);
    } catch (error) {
      addNotification({
        message: `Chat failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
        severity: 'error',
        open: true,
      });
      
      // Добавляем сообщение об ошибке
      const errorMessage: Message = {
        id: (Date.now() + 1).toString(),
        type: 'assistant',
        content: 'Sorry, I encountered an error while processing your request. Please try again.',
        timestamp: new Date(),
      };
      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
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
        // Здесь можно добавить логику для просмотра файла
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
    // Здесь можно добавить логику для просмотра содержимого файла
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

  const findFileByPath = (filePath: string): ApiFile | undefined => {
    return files.find(file => file.path === filePath);
  };

  if (!selectedContainer) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '50vh' }}>
        <Alert severity="info" sx={{ maxWidth: 400 }}>
          Please select a container first to chat with the AI assistant
        </Alert>
      </Box>
    );
  }

  return (
    <Box sx={{ height: 'calc(100vh - 200px)', display: 'flex', flexDirection: 'column' }}>
      <Grid container spacing={3} sx={{ flex: 1, minHeight: 0 }}>
        {/* Чат-панель */}
        <Grid sx={{ flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0 }}>
          <Paper 
            sx={{ 
              flex: 1,
              display: 'flex', 
              flexDirection: 'column',
              minHeight: 0,
              background: 'linear-gradient(135deg, rgba(26, 31, 54, 0.8) 0%, rgba(26, 31, 54, 0.6) 100%)',
              border: '1px solid rgba(255, 255, 255, 0.08)',
            }}
          >
            {/* Сообщения */}
            <Box sx={{ flex: 1, p: 2, overflow: 'auto', minHeight: 0 }}>
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
                    <BotIcon sx={{ fontSize: 64, mb: 2, opacity: 0.5 }} />
                    <Typography variant="h6" gutterBottom>
                      Chat with AI Assistant
                    </Typography>
                    <Typography variant="body2">
                      Ask questions about your files and get intelligent answers based on their content
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
                              <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 1, mb: 1 }}>
                                <BotIcon sx={{ color: 'primary.main', mt: 0.5 }} />
                                <Paper
                                  sx={{
                                    p: 2,
                                    flex: 1,
                                    background: 'rgba(255, 255, 255, 0.05)',
                                    border: '1px solid rgba(255, 255, 255, 0.08)',
                                  }}
                                >
                                  <Typography variant="body1" sx={{ whiteSpace: 'pre-wrap' }}>
                                    {message.content}
                                  </Typography>

                                  {/* Использованные файлы */}
                                  {message.used_files && message.used_files.length > 0 && (
                                    <Box sx={{ mt: 2 }}>
                                      <Typography variant="subtitle2" gutterBottom sx={{ opacity: 0.8 }}>
                                        Sources used:
                                      </Typography>
                                      {message.used_files.map((fileInfo, index) => {
                                        const file = findFileByPath(fileInfo.file_path);
                                        return (
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
                                            onClick={() => file && handleFileAction('view', file)}
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
                                                  {getFileIcon(fileInfo.file_name)}
                                                </Box>
                                                <Box sx={{ flex: 1, minWidth: 0 }}>
                                                  <Typography variant="body2" noWrap fontWeight={600}>
                                                    {fileInfo.file_name}
                                                  </Typography>
                                                  <Typography variant="caption" color="text.secondary" noWrap>
                                                    {fileInfo.file_path}
                                                  </Typography>
                                                </Box>
                                                <Chip
                                                  label={`${formatScore(fileInfo.relevance_score)}% relevant`}
                                                  size="small"
                                                  color="success"
                                                  variant="outlined"
                                                />
                                              </Box>
                                              
                                              {/* Превью контента */}
                                              {fileInfo.content_snippet && (
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
                                                    whiteSpace: 'pre-wrap',
                                                  }}
                                                >
                                                  {fileInfo.content_snippet}
                                                </Typography>
                                              )}
                                            </CardContent>
                                          </Card>
                                        );
                                      })}
                                    </Box>
                                  )}
                                </Paper>
                              </Box>
                              <Typography variant="caption" color="text.secondary" sx={{ ml: 4 }}>
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
                <Box sx={{ display: 'flex', justifyContent: 'flex-start', mb: 2, ml: 4 }}>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <BotIcon sx={{ color: 'primary.main' }} />
                    <Paper
                      sx={{
                        p: 2,
                        background: 'rgba(255, 255, 255, 0.05)',
                        border: '1px solid rgba(255, 255, 255, 0.08)',
                      }}
                    >
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <CircularProgress size={16} />
                        <Typography variant="body2">Thinking...</Typography>
                      </Box>
                    </Paper>
                  </Box>
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
                  onClick={handleSendMessage}
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
        <Grid sx={{ display: 'flex', flexDirection: 'column', minWidth: 0, width: 350 }}>
          <Paper 
            sx={{ 
              flex: 1,
              display: 'flex',
              flexDirection: 'column',
              minHeight: 0,
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
                {files.length} files available for AI analysis
              </Typography>
            </Box>

            <Box sx={{ flex: 1, p: 2, overflow: 'auto', minHeight: 0 }}>
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