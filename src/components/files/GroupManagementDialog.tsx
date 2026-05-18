import React, { useState } from "react";
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Box,
  Typography,
  Stack,
  TextField,
  Button,
  Divider,
  Paper,
  IconButton,
} from "@mui/material";
import {
  Edit as EditIcon,
  Delete as DeleteIcon,
  CheckCircle as CheckCircleIcon,
} from "@mui/icons-material";
import type { Group } from "../../api/client";
import { useCreateGroup, useDeleteGroup, useUpdateGroupColor } from "../../hooks/useApi";
import { useNotifications } from "../../hooks/useApi";
import { PREDEFINED_COLORS } from "./constants";
import type { GroupManagementDialogProps } from "./types";

export const GroupManagementDialog: React.FC<GroupManagementDialogProps> = ({
  open,
  onClose,
  containerId,
  groups,
  refetchGroups,
}) => {
  const createGroup = useCreateGroup();
  const deleteGroup = useDeleteGroup();
  const updateGroupColor = useUpdateGroupColor();
  const [newGroupName, setNewGroupName] = useState("");
  const [newGroupColor, setNewGroupColor] = useState("#ff9800");
  const [editingGroupId, setEditingGroupId] = useState<string | null>(null);
  const [editingColor, setEditingColor] = useState("#ff9800");
  const { addNotification } = useNotifications();

  const handleCreateGroup = async () => {
    if (!newGroupName.trim()) return;
    await createGroup.mutateAsync({
      containerId,
      name: newGroupName,
      description: "",
      color: newGroupColor,
    });
    setNewGroupName("");
    setNewGroupColor("#ff9800");
    refetchGroups();
    addNotification({
      message: `Group "${newGroupName}" created`,
      severity: "success",
      open: true,
    });
  };

  const handleDeleteGroup = async (groupId: string) => {
    if (window.confirm("Delete group? All file associations will be lost.")) {
      await deleteGroup.mutateAsync(groupId);
      refetchGroups();
      addNotification({
        message: `Group "${groupId}" deleted`,
        severity: "success",
        open: true,
      });
    }
  };

  const handleUpdateColor = async (groupId: string) => {
    await updateGroupColor.mutateAsync({ groupId, color: editingColor });
    refetchGroups();
    setEditingGroupId(null);
    addNotification({
      message: `Group color updated`,
      severity: "success",
      open: true,
    });
  };

  return (
    <Dialog
      open={open}
      onClose={onClose}
      maxWidth="sm"
      fullWidth
      PaperProps={{
        sx: {
          borderRadius: 3,
          background: "rgba(26,31,54,0.98)",
          backdropFilter: "blur(20px)",
        },
      }}
    >
      <DialogTitle>Manage Groups</DialogTitle>
      <DialogContent dividers>
        <Box sx={{ mb: 3 }}>
          <Typography variant="subtitle2" gutterBottom>
            Create New Group
          </Typography>
          <Stack direction="row" spacing={2} alignItems="center">
            <TextField
              size="small"
              placeholder="Group name"
              value={newGroupName}
              onChange={(e) => setNewGroupName(e.target.value)}
              fullWidth
            />
            <Box sx={{ position: "relative" }}>
              <Box
                sx={{
                  width: 40,
                  height: 40,
                  borderRadius: "50%",
                  backgroundColor: newGroupColor,
                  cursor: "pointer",
                  border: "2px solid rgba(255,255,255,0.3)",
                }}
              />
              <input
                type="color"
                value={newGroupColor}
                onChange={(e) => setNewGroupColor(e.target.value)}
                style={{
                  position: "absolute",
                  top: 0,
                  left: 0,
                  width: 40,
                  height: 40,
                  opacity: 0,
                  cursor: "pointer",
                }}
              />
            </Box>
            <Button
              variant="contained"
              onClick={handleCreateGroup}
              disabled={!newGroupName.trim()}
            >
              Create
            </Button>
          </Stack>
        </Box>
        <Divider sx={{ my: 2 }} />
        <Typography variant="subtitle2" gutterBottom>
          Existing Groups
        </Typography>
        <Stack spacing={1}>
          {groups.map((group) => (
            <Paper key={group.id} variant="outlined" sx={{ p: 1.5 }}>
              <Stack
                direction="row"
                justifyContent="space-between"
                alignItems="center"
              >
                <Stack direction="row" alignItems="center" spacing={1}>
                  {editingGroupId === group.id ? (
                    <>
                      <Box sx={{ position: "relative" }}>
                        <Box
                          sx={{
                            width: 32,
                            height: 32,
                            borderRadius: "50%",
                            backgroundColor: editingColor,
                            border: "2px solid rgba(255,255,255,0.3)",
                          }}
                        />
                        <input
                          type="color"
                          value={editingColor}
                          onChange={(e) => setEditingColor(e.target.value)}
                          style={{
                            position: "absolute",
                            top: 0,
                            left: 0,
                            width: 32,
                            height: 32,
                            opacity: 0,
                            cursor: "pointer",
                          }}
                        />
                      </Box>
                      <TextField
                        size="small"
                        value={group.id}
                        disabled
                        sx={{ minWidth: 150 }}
                      />
                    </>
                  ) : (
                    <>
                      <Box
                        sx={{
                          width: 32,
                          height: 32,
                          borderRadius: "50%",
                          backgroundColor: group.color || "#ff9800",
                        }}
                      />
                      <Typography variant="body2">{group.id}</Typography>
                    </>
                  )}
                </Stack>
                <Stack direction="row" spacing={1}>
                  {editingGroupId === group.id ? (
                    <IconButton
                      size="small"
                      onClick={() => handleUpdateColor(group.id)}
                      sx={{ color: "#4caf50" }}
                    >
                      <CheckCircleIcon fontSize="small" />
                    </IconButton>
                  ) : (
                    <IconButton
                      size="small"
                      onClick={() => {
                        setEditingGroupId(group.id);
                        setEditingColor(group.color || "#ff9800");
                      }}
                    >
                      <EditIcon fontSize="small" />
                    </IconButton>
                  )}
                  <IconButton
                    size="small"
                    onClick={() => handleDeleteGroup(group.id)}
                    sx={{ color: "error.main" }}
                  >
                    <DeleteIcon fontSize="small" />
                  </IconButton>
                </Stack>
              </Stack>
              <Typography variant="caption" color="text.secondary">
                ID: {group.id}
              </Typography>
              {editingGroupId === group.id && (
                <Stack
                  direction="row"
                  spacing={1}
                  sx={{ mt: 1, flexWrap: "wrap" }}
                >
                  {PREDEFINED_COLORS.map((color) => (
                    <Box
                      key={color}
                      sx={{
                        width: 28,
                        height: 28,
                        borderRadius: "50%",
                        backgroundColor: color,
                        cursor: "pointer",
                        border:
                          editingColor === color
                            ? "2px solid white"
                            : "2px solid transparent",
                      }}
                      onClick={() => setEditingColor(color)}
                    />
                  ))}
                </Stack>
              )}
            </Paper>
          ))}
        </Stack>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Close</Button>
      </DialogActions>
    </Dialog>
  );
};