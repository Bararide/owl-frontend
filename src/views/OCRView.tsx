import React, { useState, useRef, useEffect } from 'react';
import {
  Box,
  Typography,
  Paper,
  Button,
  IconButton,
  Divider,
  CircularProgress,
  Alert,
  Grid,
  Card,
  CardContent,
  Tooltip,
  Chip,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
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
  text?: string;
  confidence?: number;
  processingTime?: number;
  timestamp: Date;
}

type OutputFormat = 'txt' | 'pdf' | 'json';

export const OcrView: React.FC<OcrViewProps> = ({
  selectedContainer,
  onContainerSelect,
}) => {
  const [uploadedFiles, setUploadedFiles] = useState<File[]>([]);
  const [ocrResults, setOcrResults] = useState<OcrResult[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [selectedFormat, setSelectedFormat] = useState<OutputFormat>('txt');
  const [previewText, setPreviewText] = useState<string>('');
  const [previewOpen, setPreviewOpen] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const ocrProcessMutation = useOcrProcess();
  const { addNotification } = useNotifications();

  const supportedFormats = [
    'image/png', 'image/jpeg', 'image/jpg', 'image/gif', 
    'image/bmp', 'image/tiff', 'application/pdf'
  ];

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (!files) return;

    const newFiles = Array.from(files).filter(file => 
      supportedFormats.includes(file.type)
    );

    if (newFiles.length !== files.length) {
      addNotification({
        message: 'Some files were skipped - only images and PDFs are supported',
        severity: 'warning',
        open: true,
      });
    }

    setUploadedFiles(prev => [...prev, ...newFiles]);
    
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleRemoveFile = (index: number) => {
    setUploadedFiles(prev => prev.filter((_, i) => i !== index));
  };

  const handleProcessOcr = async () => {
    if (!selectedContainer || uploadedFiles.length === 0) return;

    setIsProcessing(true);

    const initialResults: OcrResult[] = uploadedFiles.map(file => ({
      id: Math.random().toString(36).substr(2, 9),
      fileName: file.name,
      fileType: file.type,
      status: 'processing',
      timestamp: new Date(),
    }));

    setOcrResults(prev => [...prev, ...initialResults]);

    try {
      for (let i = 0; i < uploadedFiles.length; i++) {
        const file = uploadedFiles[i];
        const resultId = initialResults[i].id;

        try {
          const result = await ocrProcessMutation.mutateAsync({
            container_id: selectedContainer.id,
            file: file
          });

          setOcrResults(prev => prev.map(ocrResult => 
            ocrResult.id === resultId 
              ? {
                  ...ocrResult,
                  status: 'completed',
                  text: result.text,
                  confidence: result.confidence,
                  processingTime: result.processing_time,
                }
              : ocrResult
          ));

          addNotification({
            message: `Processed: ${file.name}`,
            severity: 'success',
            open: true,
          });

        } catch (error) {
          setOcrResults(prev => prev.map(ocrResult => 
            ocrResult.id === resultId 
              ? { ...ocrResult, status: 'error' }
              : ocrResult
          ));

          addNotification({
            message: `Failed to process ${file.name}: ${error instanceof Error ? error.message : 'Unknown error'}`,
            severity: 'error',
            open: true,
          });
        }
      }

      setUploadedFiles([]);

    } catch (error) {
      addNotification({
        message: `OCR processing failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
        severity: 'error',
        open: true,
      });
    } finally {
      setIsProcessing(false);
    }
  };

  const handleDownloadResult = (result: OcrResult) => {
    if (!result.text) return;

    let content: string;
    let mimeType: string;
    let extension: string;

    switch (selectedFormat) {
      case 'json':
        content = JSON.stringify({
          fileName: result.fileName,
          text: result.text,
          confidence: result.confidence,
          processingTime: result.processingTime,
          timestamp: result.timestamp.toISOString(),
        }, null, 2);
        mimeType = 'application/json';
        extension = 'json';
        break;
      case 'pdf':
        content = result.text;
        mimeType = 'text/plain';
        extension = 'txt';
        break;
      case 'txt':
      default:
        content = result.text;
        mimeType = 'text/plain';
        extension = 'txt';
    }

    const blob = new Blob([content], { type: mimeType });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${result.fileName.split('.')[0]}_ocr.${extension}`;
    document.body.appendChild(a);
    a.click();
    window.URL.revokeObjectURL(url);
    document.body.removeChild(a);
  };

  const handlePreviewText = (text: string) => {
    setPreviewText(text);
    setPreviewOpen(true);
  };

  const handleFormatChange = (event: SelectChangeEvent<OutputFormat>) => {
    setSelectedFormat(event.target.value as OutputFormat);
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
      {/* Header */}
      <Box sx={{ p: 2, borderBottom: '1px solid rgba(255, 255, 255, 0.08)' }}>
        <Typography variant="h6" sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <ImageIcon />
          OCR Processing
        </Typography>
        <Typography variant="caption" color="text.secondary">
          Extract text from images and PDF files
        </Typography>
      </Box>

      <Grid container spacing={3} sx={{ flex: 1, minHeight: 0 }}>
        {/* Left Panel - Upload and Processing */}
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
              <Typography variant="subtitle1" gutterBottom>
                Upload Files
              </Typography>
              <Typography variant="caption" color="text.secondary">
                Supported formats: PNG, JPEG, GIF, BMP, TIFF, PDF
              </Typography>
            </Box>

            <Box sx={{ flex: 1, p: 2, overflow: 'auto', minHeight: 0 }}>
              {/* Upload Area */}
              <Box
                sx={{
                  border: '2px dashed rgba(255, 255, 255, 0.2)',
                  borderRadius: 2,
                  p: 4,
                  textAlign: 'center',
                  mb: 2,
                  cursor: 'pointer',
                  transition: 'all 0.2s ease',
                  '&:hover': {
                    borderColor: 'primary.main',
                    backgroundColor: 'rgba(115, 103, 240, 0.05)',
                  },
                }}
                onClick={() => fileInputRef.current?.click()}
              >
                <UploadIcon sx={{ fontSize: 48, mb: 1, opacity: 0.7 }} />
                <Typography variant="h6" gutterBottom>
                  Drop files here or click to upload
                </Typography>
                <Typography variant="caption" color="text.secondary">
                  Maximum file size: 10MB per file
                </Typography>
              </Box>

              <input
                type="file"
                ref={fileInputRef}
                onChange={handleFileSelect}
                multiple
                accept=".png,.jpg,.jpeg,.gif,.bmp,.tiff,.tif,.pdf"
                style={{ display: 'none' }}
              />

              {/* Uploaded Files List */}
              {uploadedFiles.length > 0 && (
                <Box sx={{ mb: 2 }}>
                  <Typography variant="subtitle2" gutterBottom>
                    Selected Files ({uploadedFiles.length})
                  </Typography>
                  <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                    {uploadedFiles.map((file, index) => (
                      <Card key={index} variant="outlined" sx={{ background: 'rgba(255, 255, 255, 0.02)' }}>
                        <CardContent sx={{ py: 1, '&:last-child': { py: 1 } }}>
                          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, minWidth: 0 }}>
                              <ImageIcon sx={{ fontSize: 20, opacity: 0.7 }} />
                              <Typography variant="body2" noWrap sx={{ flex: 1 }}>
                                {file.name}
                              </Typography>
                            </Box>
                            <IconButton
                              size="small"
                              onClick={() => handleRemoveFile(index)}
                              disabled={isProcessing}
                            >
                              <DeleteIcon fontSize="small" />
                            </IconButton>
                          </Box>
                          <Typography variant="caption" color="text.secondary">
                            {(file.size / 1024 / 1024).toFixed(2)} MB
                          </Typography>
                        </CardContent>
                      </Card>
                    ))}
                  </Box>
                </Box>
              )}

              {/* Settings */}
              <Box sx={{ mt: 2 }}>
                <FormControl fullWidth size="small">
                  <InputLabel>Output Format</InputLabel>
                  <Select
                    value={selectedFormat}
                    label="Output Format"
                    onChange={handleFormatChange}
                  >
                    <MenuItem value="txt">Text (.txt)</MenuItem>
                    <MenuItem value="json">JSON (.json)</MenuItem>
                    <MenuItem value="pdf">PDF (.pdf)</MenuItem>
                  </Select>
                </FormControl>
              </Box>
            </Box>

            {/* Action Buttons */}
            <Box sx={{ p: 2, borderTop: '1px solid rgba(255, 255, 255, 0.08)' }}>
              <Button
                fullWidth
                variant="contained"
                onClick={handleProcessOcr}
                disabled={uploadedFiles.length === 0 || isProcessing || !selectedContainer}
                startIcon={isProcessing ? <CircularProgress size={16} /> : <ImageIcon />}
              >
                {isProcessing ? 'Processing...' : `Process ${uploadedFiles.length} File(s)`}
              </Button>
            </Box>
          </Paper>
        </Grid>

        {/* Right Panel - Results */}
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
                      Upload files and start OCR processing to see results here
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
                                Time: {result.processingTime}s
                              </Typography>
                            )}

                            {result.text && (
                              <Box sx={{ mt: 1, display: 'flex', gap: 1 }}>
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

      {/* Text Preview Dialog */}
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
    </Box>
  );
};