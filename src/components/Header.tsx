import React, { useState } from "react";
import {
  AppBar,
  Toolbar,
  Typography,
  Button,
  IconButton,
  Box,
  Drawer,
  List,
  ListItem,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  Divider,
  useMediaQuery,
  useTheme,
  Dialog,
  DialogActions,
  DialogContent,
  DialogContentText,
  DialogTitle,
  CircularProgress
} from "@mui/material";
import {
  Menu as MenuIcon,
  Home as HomeIcon,
  Search as SearchIcon,
  NoteAdd as NoteAddIcon,
  Refresh as RefreshIcon,
  Code as CodeIcon
} from "@mui/icons-material";
import { Link, useLocation } from "react-router-dom";
import { rebuildIndex } from "../api/vectorFsApi";

const Header: React.FC = () => {
  const location = useLocation();
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down("md"));
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [rebuilding, setRebuilding] = useState(false);
  const [rebuildMessage, setRebuildMessage] = useState<string | null>(null);

  const handleRebuildIndex = async () => {
    setRebuilding(true);
    try {
      const response = await rebuildIndex();
      if (response.status === "success" && response.data) {
        setRebuildMessage(response.data.message);
      } else {
        setRebuildMessage(response.error || "Failed to rebuild index");
      }
    } finally {
      setRebuilding(false);
    }
  };

  const toggleDrawer = (open: boolean) => () => {
    setDrawerOpen(open);
  };

  const menuItems = [
    { text: "Home", icon: <HomeIcon />, path: "/" },
    { text: "Create File", icon: <NoteAddIcon />, path: "/create" },
    { text: "Semantic Search", icon: <SearchIcon />, path: "/search" }
  ];

  const drawer = (
    <Box sx={{ width: 250 }} role="presentation" onClick={toggleDrawer(false)}>
      <List>
        <ListItem disablePadding>
          <ListItemButton>
            <ListItemIcon>
              <CodeIcon />
            </ListItemIcon>
            <ListItemText primary="Vector File System" />
          </ListItemButton>
        </ListItem>
      </List>
      <Divider />
      <List>
        {menuItems.map((item) => (
          <ListItem key={item.text} disablePadding>
            <ListItemButton
              component={Link}
              to={item.path}
              selected={location.pathname === item.path}
            >
              <ListItemIcon>{item.icon}</ListItemIcon>
              <ListItemText primary={item.text} />
            </ListItemButton>
          </ListItem>
        ))}
      </List>
      <Divider />
      <List>
        <ListItem disablePadding>
          <ListItemButton onClick={() => setDialogOpen(true)}>
            <ListItemIcon>
              <RefreshIcon />
            </ListItemIcon>
            <ListItemText primary="Rebuild Index" />
          </ListItemButton>
        </ListItem>
      </List>
    </Box>
  );

  return (
    <>
      <AppBar position="sticky">
        <Toolbar>
          {isMobile && (
            <IconButton
              size="large"
              edge="start"
              color="inherit"
              aria-label="menu"
              sx={{ mr: 2 }}
              onClick={toggleDrawer(true)}
            >
              <MenuIcon />
            </IconButton>
          )}

          <Typography variant="h6" component="div" sx={{ flexGrow: 1 }}>
            Vector File System
          </Typography>

          {!isMobile && (
            <Box sx={{ display: "flex", gap: 1 }}>
              {menuItems.map((item) => (
                <Button
                  key={item.text}
                  color="inherit"
                  component={Link}
                  to={item.path}
                  startIcon={item.icon}
                  variant={
                    location.pathname === item.path ? "outlined" : "text"
                  }
                >
                  {item.text}
                </Button>
              ))}
              <Button
                color="inherit"
                startIcon={<RefreshIcon />}
                onClick={() => setDialogOpen(true)}
              >
                Rebuild Index
              </Button>
            </Box>
          )}
        </Toolbar>
      </AppBar>

      <Drawer anchor="left" open={drawerOpen} onClose={toggleDrawer(false)}>
        {drawer}
      </Drawer>

      <Dialog
        open={dialogOpen}
        onClose={() => !rebuilding && setDialogOpen(false)}
      >
        <DialogTitle>Rebuild Vector Index</DialogTitle>
        <DialogContent>
          <DialogContentText>
            {rebuildMessage
              ? rebuildMessage
              : "This will rebuild the vector index for the file system. This operation might take some time depending on the size of your file system."}
          </DialogContentText>
          {rebuilding && (
            <Box sx={{ display: "flex", justifyContent: "center", mt: 2 }}>
              <CircularProgress />
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button
            onClick={() => {
              setDialogOpen(false);
              setRebuildMessage(null);
            }}
            disabled={rebuilding}
          >
            Close
          </Button>
          {!rebuildMessage && (
            <Button
              onClick={handleRebuildIndex}
              disabled={rebuilding}
              variant="contained"
              color="primary"
              startIcon={
                rebuilding ? <CircularProgress size={20} /> : <RefreshIcon />
              }
            >
              Rebuild
            </Button>
          )}
        </DialogActions>
      </Dialog>
    </>
  );
};

export default Header;
