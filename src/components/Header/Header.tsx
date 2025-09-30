import React, { useState } from 'react';
import {
  AppBar,
  Toolbar,
  Typography,
  Button,
  Box,
  IconButton,
  Dialog,
  DialogContent,
  TextField,
  useTheme,
  useMediaQuery,
  Tooltip,
} from '@mui/material';
import { CloudUpload, Search, Settings, Close, Info, Help, Brightness4, Brightness7, Assessment } from '@mui/icons-material';
import { useTheme as useCustomTheme } from '../../hooks/useTheme';
import { useSearch } from '../../hooks/useSearch';
import { styled } from '@mui/material/styles';
import { Link, useLocation } from 'react-router-dom';

const StyledAppBar = styled(AppBar)(({ theme }) => ({
  boxShadow: '0 2px 10px rgba(0,0,0,0.1)',
  backgroundColor: theme.palette.background.paper,
  color: theme.palette.text.primary,
  borderBottom: `1px solid ${theme.palette.divider}`,
}));

const Logo = styled(Typography)(() => ({
  fontWeight: 'bold',
  fontSize: '1.5rem',
  background: 'linear-gradient(45deg, #2196F3 30%, #21CBF3 90%)',
  backgroundClip: 'text',
  WebkitBackgroundClip: 'text',
  WebkitTextFillColor: 'transparent',
  cursor: 'pointer',
  userSelect: 'none',
  textDecoration: 'none',
  '&:hover': {
    textShadow: '0 0 8px rgba(33, 150, 243, 0.5)',
  },
}));

const NavLink = styled(Link)(({ theme }) => ({
  textDecoration: 'none',
  color: theme.palette.text.primary,
  padding: theme.spacing(1, 2),
  borderRadius: theme.shape.borderRadius,
  transition: 'all var(--motion-duration, 0.2s) var(--motion-easing, ease-in-out)',
  display: 'flex',
  alignItems: 'center',
  gap: theme.spacing(0.5),
  fontSize: '0.9rem',
  '&:hover': {
    backgroundColor: theme.palette.action.hover,
    transform: 'var(--motion-transform, translateY(-1px))',
  },
  '&.active': {
    backgroundColor: theme.palette.primary.main + '20',
    color: theme.palette.primary.main,
  },
}));

const UploadButton = styled(Button)(() => ({
  background: 'linear-gradient(45deg, #2196F3 30%, #21CBF3 90%)',
  border: 0,
  borderRadius: 3,
  boxShadow: '0 3px 5px 2px rgba(33, 203, 243, .3)',
  color: 'white',
  height: 48,
  padding: '0 30px',
  '&:hover': {
    background: 'linear-gradient(45deg, #1976D2 30%, #1FA2E0 90%)',
  },
}));

const SearchContainer = styled(Box)(({ theme }) => ({
  display: 'flex',
  alignItems: 'center',
  backgroundColor: theme.palette.mode === 'dark'
    ? 'rgba(255, 255, 255, 0.05)'
    : 'rgba(0, 0, 0, 0.03)',
  borderRadius: theme.shape.borderRadius,
  padding: theme.spacing(0.5, 1),
  minWidth: 300,
  maxWidth: 600,
  width: '100%',
  border: `1px solid ${theme.palette.divider}`,
  '&:hover': {
    backgroundColor: theme.palette.mode === 'dark'
      ? 'rgba(255, 255, 255, 0.08)'
      : 'rgba(0, 0, 0, 0.05)',
  },
  '&:focus-within': {
    borderColor: theme.palette.primary.main,
    backgroundColor: theme.palette.background.paper,
  },
}));

const SearchInput = styled('div')(() => ({
  display: 'flex',
  alignItems: 'center',
  width: '100%',
  position: 'relative',
  '& .MuiSvgIcon-root': {
    marginRight: 8,
    color: 'rgba(0, 0, 0, 0.54)',
  },
  '& input': {
    border: 'none',
    outline: 'none',
    backgroundColor: 'transparent',
    width: '100%',
    padding: '8px 0',
    fontSize: '0.875rem',
    color: 'inherit',
    '&::placeholder': {
      color: 'rgba(0, 0, 0, 0.54)',
      opacity: 1,
    },
  },
}));

const SearchInputField = styled('input')(({ theme }) => ({
  border: 'none',
  outline: 'none',
  backgroundColor: 'transparent',
  width: '100%',
  padding: theme.spacing(1),
  fontSize: '0.875rem',
  color: theme.palette.text.primary,
  '&::placeholder': {
    color: theme.palette.text.secondary,
    opacity: 0.7,
  },
}));

interface HeaderProps {
  onUploadClick?: () => void;
}

const Header: React.FC<HeaderProps> = ({ onUploadClick }) => {
  const [searchOpen, setSearchOpen] = useState(false);
  const theme = useTheme();
  const { mode, toggleTheme } = useCustomTheme();
  const { searchQuery, setSearchQuery } = useSearch();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));
  const location = useLocation();

  const handleSearchSubmit = () => {
    setSearchOpen(false);
  };

  const handleSearchChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    setSearchQuery(event.target.value);
  };

  const handleSearchClose = () => {
    setSearchOpen(false);
  };

  const isActive = (path: string) => location.pathname === path;

  return (
    <StyledAppBar
      position="static"
      elevation={0}
      role="banner"
      aria-label="Main navigation"
    >
      <Toolbar
        sx={{ justifyContent: 'space-between', py: 1 }}
        role="navigation"
      >
        {/* Logo */}
        <Box
          component={Link}
          to="/"
          sx={{
            textDecoration: 'none',
            color: 'inherit',
          }}
          aria-label="Fake Checker - Go to homepage"
          role="link"
        >
          <Logo>
            Fake Checker
          </Logo>
        </Box>

        {/* Navigation Links */}
        {!isMobile && (
          <Box sx={{ display: 'flex', gap: 2, mx: 4 }}>
            <NavLink
              to="/about"
              className={isActive('/about') ? 'active' : ''}
              aria-label="About page"
            >
              <Info fontSize="small" />
              About
            </NavLink>
            <NavLink
              to="/help"
              className={isActive('/help') ? 'active' : ''}
              aria-label="Help page"
            >
              <Help fontSize="small" />
              Help
            </NavLink>
            <NavLink
              to="/advanced"
              className={isActive('/advanced') ? 'active' : ''}
              aria-label="Advanced Features page"
            >
              <Assessment fontSize="small" />
              Advanced
            </NavLink>
            <NavLink
              to="/settings"
              className={isActive('/settings') ? 'active' : ''}
              aria-label="Settings page"
            >
              <Settings fontSize="small" />
              Settings
            </NavLink>
          </Box>
        )}

        {/* Search Container */}
        {!isMobile && (
          <SearchContainer>
            <SearchInput>
              <Search fontSize="small" />
              <SearchInputField
                placeholder="Search images..."
                value={searchQuery}
                onChange={handleSearchChange}
                onKeyPress={(e) => e.key === 'Enter' && handleSearchSubmit()}
                aria-label="Search images"
              />
            </SearchInput>
          </SearchContainer>
        )}

        {/* Action Buttons */}
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          {/* Theme Toggle */}
          <Tooltip title={`Switch to ${mode === 'light' ? 'dark' : 'light'} mode`}>
            <IconButton
              onClick={toggleTheme}
              color="inherit"
              aria-label={`Switch to ${mode === 'light' ? 'dark' : 'light'} mode`}
            >
              {mode === 'light' ? <Brightness4 /> : <Brightness7 />}
            </IconButton>
          </Tooltip>

          {/* Mobile Search Button */}
          {isMobile && (
            <IconButton
              onClick={() => setSearchOpen(true)}
              aria-label="Open search"
            >
              <Search />
            </IconButton>
          )}

          {/* Upload Button */}
          <UploadButton
            variant="contained"
            startIcon={<CloudUpload />}
            size={isMobile ? "small" : "medium"}
            onClick={onUploadClick}
            aria-label="Upload image for analysis"
          >
            {isMobile ? "Upload" : "Upload Image"}
          </UploadButton>
        </Box>
      </Toolbar>

      {/* Mobile Search Dialog */}
      <Dialog
        open={searchOpen}
        onClose={handleSearchClose}
        maxWidth="sm"
        fullWidth
        aria-labelledby="search-dialog-title"
        aria-describedby="search-dialog-description"
      >
        <DialogContent sx={{ p: 2 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <Search />
            <TextField
              fullWidth
              placeholder="Search images..."
              value={searchQuery}
              onChange={handleSearchChange}
              onKeyPress={(e) => e.key === 'Enter' && handleSearchSubmit()}
              autoFocus
              variant="outlined"
              aria-label="Search images"
            />
            <IconButton
              onClick={handleSearchClose}
              aria-label="Close search"
            >
              <Close />
            </IconButton>
          </Box>
        </DialogContent>
      </Dialog>
    </StyledAppBar>
  );
};

export default Header;