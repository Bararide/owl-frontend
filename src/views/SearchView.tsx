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
  Menu,
  MenuItem,
  FormControl,
  InputLabel,
  Select,
  SelectChangeEvent,
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
  Settings as SettingsIcon,
  ExpandMore as ExpandMoreIcon,
} from '@mui/icons-material';
import { motion, AnimatePresence } from 'framer-motion';
import { Container, ApiFile } from '../api/client';
import { useChatWithBot, useFiles, useDownloadFile, useFileContent } from '../hooks/useApi';
import { FileCard } from '../components/files/FileCard';
import { FileContentDialog } from '../components/files/FileContentDialog';
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

// Типы для моделей
type ModelType = 'mistral' | 'deepseek';
type ModelConfig = {
  value: number;
  label: string;
};

const MODEL_CONFIGS: Record<ModelType, ModelConfig> = {
  mistral: { value: 0, label: 'Mistral' },
  deepseek: { value: 1, label: 'DeepSeek' }
};

export const SearchView: React.FC<SearchViewProps> = ({
  selectedContainer,
  onContainerSelect,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [messages, setMessages] = useState<Message[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [relevantFiles, setRelevantFiles] = useState<ApiFile[]>([]);
  const [selectedFile, setSelectedFile] = useState<ApiFile | null>(null);
  const [contentDialogOpen, setContentDialogOpen] = useState(false);
  const [selectedModel, setSelectedModel] = useState<ModelType>('mistral');
  const [fileLimit, setFileLimit] = useState<number>(5);
  const [settingsAnchorEl, setSettingsAnchorEl] = useState<null | HTMLElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const { addNotification } = useNotifications();

  const chatWithBotMutation = useChatWithBot();
  const { data: files = [] } = useFiles(selectedContainer?.id);
  const downloadFileMutation = useDownloadFile();

  // Получаем максимальное количество файлов из доступных файлов
  const maxFileLimit = files.length;

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  useEffect(() => {
    const allUsedFiles = messages.flatMap(msg => 
      msg.used_files?.map(usedFile => ({
        file_path: usedFile.file_path,
        file_name: usedFile.file_name,
        relevance_score: usedFile.relevance_score,
        content_snippet: usedFile.content_snippet
      })) || []
    );

    const newRelevantFiles = allUsedFiles.map(usedFile => {
      const file = files.find(f => f.path === usedFile.file_path);
      return file ? {
        ...file,
        relevance_score: usedFile.relevance_score,
        content_snippet: usedFile.content_snippet
      } : null;
    }).filter(Boolean) as ApiFile[];

    const uniqueFiles = Array.from(new Map(
      newRelevantFiles.map(file => [file.path, file])
    ).values());

    setRelevantFiles(uniqueFiles);
  }, [messages, files]);

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
      const conversationHistory = messages
        .filter(msg => msg.type === 'user' || msg.type === 'assistant')
        .map(msg => ({
          role: msg.type as 'user' | 'assistant',
          content: msg.content,
        }));

      const response = await chatWithBotMutation.mutateAsync({
        query: currentQuery,
        container_id: selectedContainer.id,
        model: MODEL_CONFIGS[selectedModel].value,
        conversation_history: conversationHistory,
        limit: fileLimit
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
        setSelectedFile(file);
        setContentDialogOpen(true);
        break;
      
      default:
        console.log(`Action ${action} on file ${file.name}`);
    }
  };

  const handleViewContent = (file: ApiFile) => {
    setSelectedFile(file);
    setContentDialogOpen(true);
  };

  const handleCloseContentDialog = () => {
    setContentDialogOpen(false);
    setSelectedFile(null);
  };

  const handleSettingsOpen = (event: React.MouseEvent<HTMLElement>) => {
    setSettingsAnchorEl(event.currentTarget);
  };

  const handleSettingsClose = () => {
    setSettingsAnchorEl(null);
  };

  const handleModelChange = (model: ModelType) => {
    setSelectedModel(model);
    handleSettingsClose();
  };

  // Исправленная функция для обработки изменения лимита
  const handleLimitChange = (event: SelectChangeEvent<number>) => {
    setFileLimit(event.target.value as number);
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
          Please select a container first to chat with the AI assistant
        </Alert>
      </Box>
    );
  }

  return (
    <Box sx={{ height: 'calc(100vh - 200px)', display: 'flex', flexDirection: 'column' }}>
      {/* Панель настроек */}
      <Box sx={{ p: 2, borderBottom: '1px solid rgba(255, 255, 255, 0.08)' }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <Typography variant="h6" sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <BotIcon />
            AI Assistant
          </Typography>
          
          <Box sx={{ display: 'flex', gap: 2, alignItems: 'center' }}>
            {/* Кнопка выбора модели */}
            <Button
              variant="outlined"
              onClick={handleSettingsOpen}
              startIcon={<SettingsIcon />}
              endIcon={<ExpandMoreIcon />}
              size="small"
            >
              {MODEL_CONFIGS[selectedModel].label}
            </Button>

            {/* Выбор лимита файлов */}
            <FormControl size="small" sx={{ minWidth: 120 }}>
              <InputLabel>Files Limit</InputLabel>
              <Select
                value={fileLimit}
                label="Files Limit"
                onChange={handleLimitChange}
              >
                <MenuItem value={0}>All files</MenuItem>
                {[1, 2, 3, 4, 5, 10, 15, 20].map(limit => (
                  <MenuItem 
                    key={limit} 
                    value={limit}
                    disabled={limit > maxFileLimit}
                  >
                    {limit} {limit <= maxFileLimit ? '' : '(max)'}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          </Box>
        </Box>

        <Typography variant="caption" color="text.secondary">
          Model: {MODEL_CONFIGS[selectedModel].label} • Files: {fileLimit === 0 ? 'All' : fileLimit} • Available: {maxFileLimit} files
        </Typography>
      </Box>

      <Grid container spacing={3} sx={{ flex: 1, minHeight: 0 }}>
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
                    <Box sx={{ mt: 2, p: 2, background: 'rgba(255, 255, 255, 0.05)', borderRadius: 1 }}>
                      <Typography variant="caption" display="block">
                        Current settings: {MODEL_CONFIGS[selectedModel].label} model, {fileLimit === 0 ? 'all' : fileLimit} files
                      </Typography>
                    </Box>
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
                Relevant Files
              </Typography>
              <Typography variant="caption" color="text.secondary">
                {relevantFiles.length} files used in conversation
              </Typography>
            </Box>

            <Box sx={{ flex: 1, p: 2, overflow: 'auto', minHeight: 0 }}>
              {relevantFiles.length === 0 ? (
                <Box sx={{ textAlign: 'center', color: 'text.secondary', py: 4 }}>
                  <DescriptionIcon sx={{ fontSize: 48, mb: 1, opacity: 0.5 }} />
                  <Typography variant="body2">
                    {messages.length === 0 
                      ? "Send a message to see relevant files" 
                      : "No files used yet"}
                  </Typography>
                </Box>
              ) : (
                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                  {relevantFiles.map((file, index) => (
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
                </Box>
              )}
            </Box>
          </Paper>
        </Grid>
      </Grid>

      {/* Меню выбора модели */}
      <Menu
        anchorEl={settingsAnchorEl}
        open={Boolean(settingsAnchorEl)}
        onClose={handleSettingsClose}
      >
        <MenuItem 
          onClick={() => handleModelChange('mistral')}
          selected={selectedModel === 'mistral'}
        >
          Mistral
        </MenuItem>
        <MenuItem 
          onClick={() => handleModelChange('deepseek')}
          selected={selectedModel === 'deepseek'}
        >
          DeepSeek
        </MenuItem>
      </Menu>

      <FileContentDialog
        open={contentDialogOpen}
        onClose={handleCloseContentDialog}
        file={selectedFile}
        containerId={selectedContainer?.id || ''}
      />
    </Box>
  );
};