// src/pages/HomePage.tsx
import React, { useState, useEffect } from 'react';
import {
  Container,
  Typography,
  Paper,
  Box,
  Card,
  CardContent,
  Grid,
  Divider,
  List,
  ListItem,
  ListItemButton,
  ListItemText,
  ListItemIcon,
  Tooltip,
  CircularProgress
} from '@mui/material';
import {
  Description as FileIcon,
  Search as SearchIcon,
  Create as CreateIcon,
  Build as BuildIcon
} from '@mui/icons-material';
import { Link } from 'react-router-dom';
import { semanticSearch } from '../api/vectorFsApi';

const HomePage: React.FC = () => {
  const [recentFiles, setRecentFiles] = useState<{ path: string; score: number }[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchRecentFiles = async () => {
      try {
        const response = await semanticSearch('', 5);
        if (response.status === 'success' && response.data) {
          setRecentFiles(response.data.results);
        }
      } finally {
        setLoading(false);
      }
    };

    fetchRecentFiles();
  }, []);

  const features = [
    {
      title: 'Create Files',
      description: 'Create text files with semantic context in the vector file system',
      icon: <CreateIcon fontSize="large" color="primary" />,
      link: '/create'
    },
    {
      title: 'Semantic Search',
      description: 'Find files based on meaning and context, not just keywords',
      icon: <SearchIcon fontSize="large" color="primary" />,
      link: '/search'
    },
    {
      title: 'Vector Operations',
      description: 'Leverage vector embeddings for advanced file operations',
      icon: <BuildIcon fontSize="large" color="primary" />,
      link: '/search'
    }
  ];

  return (
    <Container maxWidth="lg" sx={{ mt: 4, mb: 4 }}>
      <Paper elevation={3} sx={{ p: 4, mb: 4, borderRadius: 2 }}>
        <Typography variant="h4" gutterBottom>
          Welcome to Vector File System
        </Typography>
        <Typography variant="body1" paragraph>
          A modern file system that organizes content based on semantic meaning using vector embeddings.
          Easily create, search, and manage files with semantic context.
        </Typography>
        <Divider sx={{ my: 2 }} />
        <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 3, mt: 1 }}>
          {features.map((feature, index) => (
            <Box key={index} sx={{ flex: { xs: '1 1 100%', md: '1 1 calc(33.333% - 16px)' } }}>
              <Card 
                component={Link} 
                to={feature.link} 
                sx={{ 
                  height: '100%', 
                  display: 'flex', 
                  flexDirection: 'column',
                  textDecoration: 'none',
                  transition: 'transform 0.2s, box-shadow 0.2s',
                  '&:hover': {
                    transform: 'translateY(-4px)',
                    boxShadow: 6,
                  }
                }}
              >
                <CardContent sx={{ flexGrow: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center' }}>
                  <Box sx={{ mb: 2 }}>
                    {feature.icon}
                  </Box>
                  <Typography variant="h6" component="h3" gutterBottom>
                    {feature.title}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    {feature.description}
                  </Typography>
                </CardContent>
              </Card>
            </Box>
          ))}
        </Box>
      </Paper>

      <Paper elevation={3} sx={{ p: 4, borderRadius: 2 }}>
        <Typography variant="h5" gutterBottom>
          Recent Files
        </Typography>
        
        {loading ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
            <CircularProgress />
          </Box>
        ) : recentFiles.length > 0 ? (
          <List>
            {recentFiles.map((file, index) => (
              <React.Fragment key={index}>
                {index > 0 && <Divider component="li" />}
                <ListItem>
                  <ListItemButton
                    component={Link}
                    to={`/view/${encodeURIComponent(file.path)}`}
                  >
                    <ListItemIcon>
                      <FileIcon />
                    </ListItemIcon>
                    <ListItemText
                      primary={file.path}
                      secondary={`Relevance score: ${(file.score * 100).toFixed(1)}%`}
                    />
                  </ListItemButton>
                </ListItem>
              </React.Fragment>
            ))}
          </List>
        ) : (
          <Typography variant="body1" color="text.secondary" sx={{ py: 2 }}>
            No files available. Start by creating a new file.
          </Typography>
        )}
      </Paper>
    </Container>
  );
};

export default HomePage;