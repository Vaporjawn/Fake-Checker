import React from 'react';
import {
  Box,
  Paper,
  Typography,
  Button,
  Card,
  CardContent,
  AppBar,
  Toolbar,
  Chip,
  TextField,
  Switch,
  FormControlLabel,
  Alert,
  useTheme,
} from '@mui/material';
import { useTheme as useCustomTheme } from '../../hooks/useTheme';

const ThemeDemo: React.FC = () => {
  const theme = useTheme();
  const { mode } = useCustomTheme();

  return (
    <Box sx={{ p: 3, maxWidth: 800, mx: 'auto' }}>
      <Typography variant="h4" gutterBottom>
        Theme Demo - Current Mode: {mode}
      </Typography>

      {/* Background Colors */}
      <Box sx={{ mb: 3 }}>
        <Typography variant="h6" gutterBottom>Background Colors</Typography>
        <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap' }}>
          <Box sx={{
            p: 2,
            backgroundColor: 'background.default',
            border: `1px solid ${theme.palette.divider}`,
            borderRadius: 1
          }}>
            background.default
          </Box>
          <Box sx={{
            p: 2,
            backgroundColor: 'background.paper',
            border: `1px solid ${theme.palette.divider}`,
            borderRadius: 1
          }}>
            background.paper
          </Box>
        </Box>
      </Box>

      {/* Text Colors */}
      <Box sx={{ mb: 3 }}>
        <Typography variant="h6" gutterBottom>Text Colors</Typography>
        <Typography color="text.primary">Primary Text</Typography>
        <Typography color="text.secondary">Secondary Text</Typography>
        <Typography color="text.disabled">Disabled Text</Typography>
      </Box>

      {/* Material-UI Components */}
      <Box sx={{ mb: 3 }}>
        <Typography variant="h6" gutterBottom>Material-UI Components</Typography>

        {/* Paper */}
        <Paper sx={{ p: 2, mb: 2 }}>
          <Typography>This is a Paper component</Typography>
        </Paper>

        {/* Card */}
        <Card sx={{ mb: 2 }}>
          <CardContent>
            <Typography variant="h6">Card Title</Typography>
            <Typography color="text.secondary">
              This is a card with some content to show how it looks in the current theme.
            </Typography>
          </CardContent>
        </Card>

        {/* AppBar */}
        <AppBar position="static" sx={{ mb: 2 }}>
          <Toolbar>
            <Typography variant="h6">Sample AppBar</Typography>
          </Toolbar>
        </AppBar>

        {/* Form Elements */}
        <Box sx={{ display: 'flex', gap: 2, mb: 2, flexWrap: 'wrap' }}>
          <TextField label="Sample Input" variant="outlined" />
          <FormControlLabel control={<Switch />} label="Sample Switch" />
        </Box>

        {/* Buttons */}
        <Box sx={{ display: 'flex', gap: 2, mb: 2, flexWrap: 'wrap' }}>
          <Button variant="contained">Contained</Button>
          <Button variant="outlined">Outlined</Button>
          <Button variant="text">Text</Button>
        </Box>

        {/* Chips */}
        <Box sx={{ display: 'flex', gap: 1, mb: 2, flexWrap: 'wrap' }}>
          <Chip label="Default" />
          <Chip label="Primary" color="primary" />
          <Chip label="Secondary" color="secondary" />
        </Box>

        {/* Alerts */}
        <Alert severity="success" sx={{ mb: 1 }}>Success Alert</Alert>
        <Alert severity="info" sx={{ mb: 1 }}>Info Alert</Alert>
        <Alert severity="warning" sx={{ mb: 1 }}>Warning Alert</Alert>
        <Alert severity="error">Error Alert</Alert>
      </Box>

      {/* Theme Properties */}
      <Paper sx={{ p: 2 }}>
        <Typography variant="h6" gutterBottom>Current Theme Properties</Typography>
        <Typography variant="body2" component="pre" sx={{ fontSize: '0.8rem' }}>
{`Mode: ${theme.palette.mode}
Primary: ${theme.palette.primary.main}
Secondary: ${theme.palette.secondary.main}
Background Default: ${theme.palette.background.default}
Background Paper: ${theme.palette.background.paper}
Text Primary: ${theme.palette.text.primary}
Text Secondary: ${theme.palette.text.secondary}`}
        </Typography>
      </Paper>
    </Box>
  );
};

export default ThemeDemo;