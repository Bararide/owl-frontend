import React, { useState, useRef } from 'react';
import {
  Box,
  Typography,
  Paper,
  Button,
  IconButton,
  CircularProgress,
  Alert,
  Grid,
  Card,
  CardContent,
  Tooltip,
  Chip,
  Menu,
  MenuItem,
  FormControl,
  InputLabel,
  Select,
  SelectChangeEvent,
} from '@mui/material';
import {
  Upload as UploadIcon,
  Image as ImageIcon,
  Description as DescriptionIcon,
  Download as DownloadIcon,
  Delete as DeleteIcon,
  Visibility as ViewIcon,
  CheckCircle as CheckCircleIcon,
  Error as ErrorIcon,
  Settings as SettingsIcon,
  ExpandMore as ExpandMoreIcon,
} from '@mui/icons-material';
import { motion, AnimatePresence } from 'framer-motion';
import { Container } from '../api/client';
import { useOcrProcess } from '../hooks/useApi';
import { useNotifications } from '../hooks/useNotifications';

interface OcrViewProps {
  selectedContainer: Container | null;
  onContainerSelect: (container: Container) => void;
}

interface OcrResult {
  id: string;
  fileName: string;
  fileType: string;
  status: 'processing' | 'completed' | 'error';
  boxCount: number;
  text?: string;
  confidence?: number;
  processingTime?: number;
  timestamp: Date;
  originalImage?: string;
  visualizedImage?: string;
}

type OcrModelType = 'deepseek_ocr' | 'hunyuan';
type OcrModelConfig = {
  value: number;
  label: string;
  description: string;
};

const OCR_MODEL_CONFIGS: Record<OcrModelType, OcrModelConfig> = {
  deepseek_ocr: { 
    value: 0, 
    label: 'Deepseek-OCR', 
    description: 'Classical OCR engine, good for clean text' 
  },
  hunyuan: { 
    value: 1, 
    label: 'hunyuan', 
    description: 'Deep learning based, supports multiple languages' 
  },
};

export const OcrView: React.FC<OcrViewProps> = ({
  selectedContainer,
}) => {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [ocrResults, setOcrResults] = useState<OcrResult[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [previewText, setPreviewText] = useState<string>('');
  const [previewOpen, setPreviewOpen] = useState(false);
  const [imagePreviewOpen, setImagePreviewOpen] = useState(false);
  const [previewImage, setPreviewImage] = useState<string>('');
  const [previewTitle, setPreviewTitle] = useState<string>('');
  const [selectedModel, setSelectedModel] = useState<OcrModelType>('deepseek_ocr');
  const [settingsAnchorEl, setSettingsAnchorEl] = useState<null | HTMLElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const ocrProcessMutation = useOcrProcess();
  const { addNotification } = useNotifications();

  const supportedFormats = [
    'image/png', 'image/jpeg', 'image/jpg', 'image/gif', 
    'image/bmp', 'image/tiff', 'application/pdf'
  ];

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (!files || files.length === 0) return;

    const file = files[0];
    
    if (!supportedFormats.includes(file.type)) {
      addNotification({
        message: 'Unsupported file format - only images and PDFs are supported',
        severity: 'warning',
        open: true,
      });
      return;
    }

    setSelectedFile(file);
    
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleRemoveFile = () => {
    setSelectedFile(null);
  };

  const handleProcessOcr = async () => {
    if (!selectedContainer || !selectedFile) return;

    setIsProcessing(true);

    const fileData = await new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => {
        const base64 = reader.result as string;
        resolve(base64);
      };
      reader.onerror = reject;
      reader.readAsDataURL(selectedFile);
    });

    const initialResult: OcrResult = {
      id: Math.random().toString(36).substr(2, 9),
      fileName: selectedFile.name,
      fileType: selectedFile.type,
      status: 'processing',
      timestamp: new Date(),
      originalImage: fileData,
      boxCount: 0
    };

    setOcrResults(prev => [initialResult, ...prev]);

    try {
      const requestData = {
        container_id: selectedContainer.id,
        file_data: fileData.split(',')[1],
        file_name: selectedFile.name,
        mime_type: selectedFile.type,
        model: OCR_MODEL_CONFIGS[selectedModel].value, // Добавляем выбранную модель
      };

      const result = await ocrProcessMutation.mutateAsync(requestData);

      setOcrResults(prev => prev.map(ocrResult => 
        ocrResult.id === initialResult.id 
          ? {
              ...ocrResult,
              status: 'completed',
              text: result.text,
              confidence: result.confidence,
              processingTime: result.processing_time,
              visualizedImage: result.visualization 
                ? `data:${result.visualization_format || 'image/jpeg'};base64,${result.visualization}`
                : undefined,
            }
          : ocrResult
      ));

      addNotification({
        message: `OCR processing completed for ${selectedFile.name} using ${OCR_MODEL_CONFIGS[selectedModel].label}`,
        severity: 'success',
        open: true,
      });

      setSelectedFile(null);

    } catch (error) {
      setOcrResults(prev => prev.map(ocrResult => 
        ocrResult.id === initialResult.id 
          ? { ...ocrResult, status: 'error' }
          : ocrResult
      ));

      addNotification({
        message: `OCR failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
        severity: 'error',
        open: true,
      });
    } finally {
      setIsProcessing(false);
    }
  };

  const handleDownloadResult = (result: OcrResult) => {
    if (!result.text) return;

    const content = result.text;
    const blob = new Blob([content], { type: 'text/plain' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${result.fileName.split('.')[0]}_ocr.txt`;
    document.body.appendChild(a);
    a.click();
    window.URL.revokeObjectURL(url);
    document.body.removeChild(a);
  };

  const handlePreviewText = (text: string) => {
    setPreviewText(text);
    setPreviewOpen(true);
  };

  const handlePreviewImage = (image: string, title: string) => {
    setPreviewImage(image);
    setPreviewTitle(title);
    setImagePreviewOpen(true);
  };

  const getStatusIcon = (status: OcrResult['status']) => {
    switch (status) {
      case 'processing':
        return <CircularProgress size={16} />;
      case 'completed':
        return <CheckCircleIcon color="success" />;
      case 'error':
        return <ErrorIcon color="error" />;
      default:
        return null;
    }
  };

  const getStatusColor = (status: OcrResult['status']) => {
    switch (status) {
      case 'processing': return 'warning';
      case 'completed': return 'success';
      case 'error': return 'error';
      default: return 'default';
    }
  };

  const handleSettingsOpen = (event: React.MouseEvent<HTMLElement>) => {
    setSettingsAnchorEl(event.currentTarget);
  };

  const handleSettingsClose = () => {
    setSettingsAnchorEl(null);
  };

  const handleModelChange = (model: OcrModelType) => {
    setSelectedModel(model);
    handleSettingsClose();
  };

  if (!selectedContainer) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '50vh' }}>
        <Alert severity="info" sx={{ maxWidth: 400 }}>
          Please select a container first to use OCR functionality
        </Alert>
      </Box>
    );
  }

  return (
    <Box sx={{ height: 'calc(100vh - 200px)', display: 'flex', flexDirection: 'column' }}>
      {/* Панель настроек */}
      <Box sx={{ p: 2, borderBottom: '1px solid rgba(255, 255, 255, 0.08)' }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
          <Typography variant="h6" sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <ImageIcon />
            OCR Processing
          </Typography>
          
          <Box sx={{ display: 'flex', gap: 2, alignItems: 'center' }}>
            {/* Кнопка выбора модели OCR */}
            <Button
              variant="outlined"
              onClick={handleSettingsOpen}
              startIcon={<SettingsIcon />}
              endIcon={<ExpandMoreIcon />}
              size="small"
            >
              {OCR_MODEL_CONFIGS[selectedModel].label}
            </Button>

            {/* Информация о выбранной модели */}
            <Typography variant="caption" color="text.secondary">
              {OCR_MODEL_CONFIGS[selectedModel].description}
            </Typography>
          </Box>
        </Box>

        {/* Область загрузки файла */}
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mt: 1 }}>
          <Button
            variant="contained"
            component="label"
            startIcon={<UploadIcon />}
            disabled={!selectedContainer}
            size="small"
          >
            Upload File
            <input
              type="file"
              hidden
              ref={fileInputRef}
              onChange={handleFileSelect}
              accept=".png,.jpg,.jpeg,.gif,.bmp,.tiff,.tif,.pdf"
            />
          </Button>
          
          {selectedFile && (
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flex: 1 }}>
              <Typography variant="body2">
                {selectedFile.name}
              </Typography>
              <IconButton
                size="small"
                onClick={handleRemoveFile}
                disabled={isProcessing}
              >
                <DeleteIcon fontSize="small" />
              </IconButton>
              <Button
                variant="outlined"
                onClick={handleProcessOcr}
                disabled={isProcessing}
                startIcon={isProcessing ? <CircularProgress size={16} /> : <ImageIcon />}
                size="small"
                sx={{ ml: 'auto' }}
              >
                {isProcessing ? 'Processing...' : 'Process OCR'}
              </Button>
            </Box>
          )}
        </Box>
      </Box>

      <Grid container spacing={3} sx={{ flex: 1, minHeight: 0, p: 2 }}>
        <Grid  sx={{flex: 1, display: 'flex', flexDirection: 'column', minHeight: 0 }}>
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
                {ocrResults.length === 0 ? (
                  <Box sx={{ 
                    display: 'flex', 
                    flexDirection: 'column', 
                    alignItems: 'center', 
                    justifyContent: 'center',
                    height: '100%',
                    color: 'text.secondary',
                    textAlign: 'center'
                  }}>
                    <ImageIcon sx={{ fontSize: 64, mb: 2, opacity: 0.5 }} />
                    <Typography variant="h6" gutterBottom>
                      No Images Yet
                    </Typography>
                    <Typography variant="body2">
                      Process a file to see original and visualized images
                    </Typography>
                    <Box sx={{ mt: 2, p: 2, background: 'rgba(255, 255, 255, 0.05)', borderRadius: 1 }}>
                      <Typography variant="caption" display="block">
                        Current model: {OCR_MODEL_CONFIGS[selectedModel].label}
                      </Typography>
                      <Typography variant="caption" display="block">
                        {OCR_MODEL_CONFIGS[selectedModel].description}
                      </Typography>
                    </Box>
                  </Box>
                ) : (
                  <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                    {ocrResults.filter(r => r.status === 'completed').map((result, index) => (
                      <motion.div
                        key={result.id}
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: index * 0.1 }}
                      >
                        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                          {result.originalImage && (
                            <Card variant="outlined" sx={{ background: 'rgba(255, 255, 255, 0.02)' }}>
                              <CardContent>
                                <Typography variant="subtitle2" gutterBottom>
                                  Original Image
                                </Typography>
                                <Box 
                                  sx={{ 
                                    cursor: 'pointer',
                                    borderRadius: 1,
                                    overflow: 'hidden',
                                    '&:hover': { opacity: 0.8 }
                                  }}
                                  onClick={() => handlePreviewImage(result.originalImage!, 'Original Image')}
                                >
                                  <img 
                                    src={result.originalImage} 
                                    alt="Original" 
                                    style={{ 
                                      width: '100%', 
                                      height: 'auto',
                                      maxHeight: 500,
                                      objectFit: 'contain'
                                    }} 
                                  />
                                </Box>
                              </CardContent>
                            </Card>
                          )}

                          {result.visualizedImage && (
                            <Card variant="outlined" sx={{ background: 'rgba(255, 255, 255, 0.02)' }}>
                              <CardContent>
                                <Typography variant="subtitle2" gutterBottom>
                                  Processed with Bounding Boxes
                                </Typography>
                                <Box 
                                  sx={{ 
                                    cursor: 'pointer',
                                    borderRadius: 1,
                                    overflow: 'hidden',
                                    '&:hover': { opacity: 0.8 }
                                  }}
                                  onClick={() => handlePreviewImage(result.visualizedImage!, 'Processed Image with Bounding Boxes')}
                                >
                                  <img 
                                    src={result.visualizedImage} 
                                    alt="Processed" 
                                    style={{ 
                                      width: '100%', 
                                      height: 'auto',
                                      maxHeight: 500,
                                      objectFit: 'contain'
                                    }} 
                                  />
                                </Box>
                                {result.boxCount && (
                                  <Typography variant="caption" color="text.secondary" display="block" sx={{ mt: 1 }}>
                                    Detected {result.boxCount} text regions
                                  </Typography>
                                )}
                              </CardContent>
                            </Card>
                          )}
                        </Box>
                      </motion.div>
                    ))}
                  </Box>
                )}
              </AnimatePresence>
            </Box>
          </Paper>
        </Grid>

        <Grid sx={{ display: 'flex', flexDirection: 'column', minHeight: 0 }}>
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
              <Typography variant="subtitle1">
                OCR Results
              </Typography>
              <Typography variant="caption" color="text.secondary">
                {ocrResults.filter(r => r.status === 'completed').length} processed •{' '}
                {ocrResults.filter(r => r.status === 'error').length} failed
              </Typography>
            </Box>

            <Box sx={{ flex: 1, p: 2, overflow: 'auto', minHeight: 0 }}>
              <AnimatePresence>
                {ocrResults.length === 0 ? (
                  <Box sx={{ 
                    display: 'flex', 
                    flexDirection: 'column', 
                    alignItems: 'center', 
                    justifyContent: 'center',
                    height: '100%',
                    color: 'text.secondary',
                    textAlign: 'center'
                  }}>
                    <DescriptionIcon sx={{ fontSize: 64, mb: 2, opacity: 0.5 }} />
                    <Typography variant="h6" gutterBottom>
                      No Results Yet
                    </Typography>
                    <Typography variant="body2">
                      Select a file and process OCR to see results here
                    </Typography>
                  </Box>
                ) : (
                  <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                    {ocrResults.map((result, index) => (
                      <motion.div
                        key={result.id}
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: index * 0.1 }}
                      >
                        <Card variant="outlined" sx={{ background: 'rgba(255, 255, 255, 0.02)' }}>
                          <CardContent>
                            <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 1, mb: 1 }}>
                              {getStatusIcon(result.status)}
                              <Typography variant="subtitle2" sx={{ flex: 1 }}>
                                {result.fileName}
                              </Typography>
                              <Chip
                                label={result.status}
                                size="small"
                                color={getStatusColor(result.status) as any}
                                variant="outlined"
                              />
                            </Box>

                            {result.confidence && (
                              <Typography variant="caption" color="text.secondary" display="block">
                                Confidence: {(result.confidence * 100).toFixed(1)}%
                              </Typography>
                            )}

                            {result.processingTime && (
                              <Typography variant="caption" color="text.secondary" display="block">
                                Time: {result.processingTime.toFixed(2)}s
                              </Typography>
                            )}

                            {result.text && (
                              <Box sx={{ mt: 1, display: 'flex', gap: 1, flexWrap: 'wrap' }}>
                                <Tooltip title="Preview text">
                                  <IconButton
                                    size="small"
                                    onClick={() => handlePreviewText(result.text!)}
                                  >
                                    <ViewIcon fontSize="small" />
                                  </IconButton>
                                </Tooltip>
                                <Tooltip title="Download result">
                                  <IconButton
                                    size="small"
                                    onClick={() => handleDownloadResult(result)}
                                  >
                                    <DownloadIcon fontSize="small" />
                                  </IconButton>
                                </Tooltip>
                                <Typography variant="caption" color="text.secondary" sx={{ ml: 'auto' }}>
                                  {result.text.length} chars
                                </Typography>
                              </Box>
                            )}
                          </CardContent>
                        </Card>
                      </motion.div>
                    ))}
                  </Box>
                )}
              </AnimatePresence>
            </Box>
          </Paper>
        </Grid>
      </Grid>

      <Menu
        anchorEl={settingsAnchorEl}
        open={Boolean(settingsAnchorEl)}
        onClose={handleSettingsClose}
      >
        <MenuItem 
          onClick={() => handleModelChange('deepseek_ocr')}
          selected={selectedModel === 'deepseek_ocr'}
        >
          <Box sx={{ display: 'flex', flexDirection: 'column' }}>
            <Typography variant="body2">Tesseract</Typography>
            <Typography variant="caption" color="text.secondary">
              Classical OCR engine, good for clean text
            </Typography>
          </Box>
        </MenuItem>
        <MenuItem 
          onClick={() => handleModelChange('hunyuan')}
          selected={selectedModel === 'hunyuan'}
        >
          <Box sx={{ display: 'flex', flexDirection: 'column' }}>
            <Typography variant="body2">EasyOCR</Typography>
            <Typography variant="caption" color="text.secondary">
              Deep learning based, supports multiple languages
            </Typography>
          </Box>
        </MenuItem>
      </Menu>

      <AnimatePresence>
        {previewOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            style={{
              position: 'fixed',
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              backgroundColor: 'rgba(0, 0, 0, 0.8)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              zIndex: 1300,
              padding: 20,
            }}
            onClick={() => setPreviewOpen(false)}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              onClick={(e) => e.stopPropagation()}
              style={{
                background: 'linear-gradient(135deg, #1a1f36 0%, #13182B 100%)',
                border: '1px solid rgba(255, 255, 255, 0.1)',
                borderRadius: 12,
                padding: 24,
                maxWidth: 800,
                width: '100%',
                maxHeight: '80vh',
                overflow: 'auto',
              }}
            >
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                <Typography variant="h6">Extracted Text</Typography>
                <IconButton onClick={() => setPreviewOpen(false)}>
                  <DeleteIcon />
                </IconButton>
              </Box>
              <Paper 
                variant="outlined" 
                sx={{ 
                  p: 2, 
                  background: 'rgba(0, 0, 0, 0.2)',
                  maxHeight: 400,
                  overflow: 'auto',
                  whiteSpace: 'pre-wrap',
                  fontFamily: 'monospace',
                  fontSize: '0.875rem',
                }}
              >
                {previewText}
              </Paper>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {imagePreviewOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            style={{
              position: 'fixed',
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              backgroundColor: 'rgba(0, 0, 0, 0.9)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              zIndex: 1300,
              padding: 20,
            }}
            onClick={() => setImagePreviewOpen(false)}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              onClick={(e) => e.stopPropagation()}
              style={{
                background: 'linear-gradient(135deg, #1a1f36 0%, #13182B 100%)',
                border: '1px solid rgba(255, 255, 255, 0.1)',
                borderRadius: 12,
                padding: 24,
                maxWidth: '90vw',
                maxHeight: '90vh',
                overflow: 'auto',
              }}
            >
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                <Typography variant="h6">{previewTitle}</Typography>
                <IconButton onClick={() => setImagePreviewOpen(false)}>
                  <DeleteIcon />
                </IconButton>
              </Box>
              <Box sx={{ display: 'flex', justifyContent: 'center' }}>
                <img 
                  src={previewImage} 
                  alt={previewTitle}
                  style={{ 
                    maxWidth: '100%', 
                    maxHeight: '70vh',
                    objectFit: 'contain'
                  }} 
                />
              </Box>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </Box>
  );
};