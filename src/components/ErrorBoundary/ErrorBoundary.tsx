import { Component } from 'react';
import type { ErrorInfo, ReactNode } from 'react';
import {
  Box,
  Paper,
  Typography,
  Button,
  Alert,
  AlertTitle,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  Stack,
  Chip
} from '@mui/material';
import {
  ErrorOutline,
  Refresh,
  BugReport,
  ExpandMore,
  Home,
  Settings
} from '@mui/icons-material';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
  onError?: (error: Error, errorInfo: ErrorInfo) => void;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
  errorId: string;
}

export class ErrorBoundary extends Component<Props, State> {
  private retryCount = 0;
  private maxRetries = 3;

  public state: State = {
    hasError: false,
    error: null,
    errorInfo: null,
    errorId: ''
  };

  public static getDerivedStateFromError(error: Error): State {
    // Update state so the next render will show the fallback UI
    return {
      hasError: true,
      error,
      errorInfo: null,
      errorId: `error-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
    };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    this.setState({
      error,
      errorInfo,
      errorId: `error-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
    });

    // Log error to console for debugging
    console.error('ErrorBoundary caught an error:', error, errorInfo);

    // Call the optional error handler
    if (this.props.onError) {
      this.props.onError(error, errorInfo);
    }

    // Log error to analytics or error reporting service
    this.logErrorToService(error, errorInfo);
  }

  private logErrorToService = (error: Error, errorInfo: ErrorInfo) => {
    // In a real app, you'd send this to an error reporting service
    const errorData = {
      message: error.message,
      stack: error.stack,
      componentStack: errorInfo.componentStack,
      errorId: this.state.errorId,
      timestamp: new Date().toISOString(),
      userAgent: navigator.userAgent,
      url: window.location.href
    };

    // For now, just log to console
    console.group('🚨 Error Report');
    console.error('Error ID:', errorData.errorId);
    console.error('Message:', errorData.message);
    console.error('Stack:', errorData.stack);
    console.error('Component Stack:', errorData.componentStack);
    console.groupEnd();
  };

  private handleRetry = () => {
    if (this.retryCount < this.maxRetries) {
      this.retryCount++;
      this.setState({
        hasError: false,
        error: null,
        errorInfo: null,
        errorId: ''
      });
    } else {
      // Max retries reached, suggest page reload
      window.location.reload();
    }
  };

  private handleGoHome = () => {
    window.location.href = '/';
  };

  private handleRefreshPage = () => {
    window.location.reload();
  };

  private getErrorCategory = (error: Error): string => {
    const message = error.message.toLowerCase();

    if (message.includes('network') || message.includes('fetch')) {
      return 'Network Error';
    }
    if (message.includes('api') || message.includes('400') || message.includes('500')) {
      return 'API Error';
    }
    if (message.includes('permission') || message.includes('unauthorized')) {
      return 'Permission Error';
    }
    if (message.includes('parse') || message.includes('json')) {
      return 'Data Error';
    }
    if (message.includes('chunk') || message.includes('loading')) {
      return 'Loading Error';
    }

    return 'Application Error';
  };

  private getUserFriendlyMessage = (error: Error): string => {
    const message = error.message.toLowerCase();

    if (message.includes('network') || message.includes('fetch')) {
      return 'There was a problem connecting to our servers. Please check your internet connection and try again.';
    }
    if (message.includes('api key')) {
      return 'There\'s an issue with your API configuration. Please check your settings and ensure your API key is valid.';
    }
    if (message.includes('rate limit')) {
      return 'You\'ve made too many requests too quickly. Please wait a moment and try again.';
    }
    if (message.includes('file size') || message.includes('too large')) {
      return 'The file you\'re trying to process is too large. Please try with a smaller image.';
    }
    if (message.includes('unsupported') || message.includes('invalid file')) {
      return 'This file format is not supported. Please try with a different image format.';
    }

    return 'Something unexpected happened. We\'re working to fix this issue.';
  };

  private getRecoveryActions = (error: Error): Array<{ label: string; action: () => void; icon: ReactNode; primary?: boolean }> => {
    const message = error.message.toLowerCase();
    const actions = [];

    if (message.includes('network') || message.includes('fetch')) {
      actions.push({
        label: 'Retry',
        action: this.handleRetry,
        icon: <Refresh />,
        primary: true
      });
    }

    if (message.includes('api key') || message.includes('settings')) {
      actions.push({
        label: 'Go to Settings',
        action: () => window.location.href = '/settings',
        icon: <Settings />,
        primary: true
      });
    }

    actions.push(
      {
        label: 'Go Home',
        action: this.handleGoHome,
        icon: <Home />
      },
      {
        label: 'Refresh Page',
        action: this.handleRefreshPage,
        icon: <Refresh />
      }
    );

    return actions;
  };

  public render() {
    if (this.state.hasError && this.state.error) {
      // If a custom fallback is provided, use it
      if (this.props.fallback) {
        return this.props.fallback;
      }

      const errorCategory = this.getErrorCategory(this.state.error);
      const userMessage = this.getUserFriendlyMessage(this.state.error);
      const recoveryActions = this.getRecoveryActions(this.state.error);

      return (
        <Box
          display="flex"
          justifyContent="center"
          alignItems="center"
          minHeight="100vh"
          p={3}
          bgcolor="background.default"
        >
          <Paper
            elevation={3}
            sx={{
              maxWidth: 600,
              width: '100%',
              p: 4,
              textAlign: 'center'
            }}
          >
            <ErrorOutline
              sx={{
                fontSize: 64,
                color: 'error.main',
                mb: 2
              }}
            />

            <Typography variant="h4" gutterBottom color="error">
              Oops! Something went wrong
            </Typography>

            <Chip
              label={errorCategory}
              color="error"
              variant="outlined"
              sx={{ mb: 3 }}
            />

            <Alert severity="error" sx={{ mb: 3, textAlign: 'left' }}>
              <AlertTitle>What happened?</AlertTitle>
              {userMessage}
            </Alert>

            <Stack direction="row" spacing={2} justifyContent="center" sx={{ mb: 3 }}>
              {recoveryActions.map((action, index) => (
                <Button
                  key={index}
                  variant={action.primary ? "contained" : "outlined"}
                  color={action.primary ? "primary" : "inherit"}
                  startIcon={action.icon}
                  onClick={action.action}
                  size="large"
                >
                  {action.label}
                </Button>
              ))}
            </Stack>

            <Accordion sx={{ textAlign: 'left' }}>
              <AccordionSummary
                expandIcon={<ExpandMore />}
                aria-controls="error-details-content"
                id="error-details-header"
              >
                <Typography variant="subtitle1" color="text.secondary">
                  <BugReport sx={{ mr: 1, verticalAlign: 'middle' }} />
                  Technical Details
                </Typography>
              </AccordionSummary>
              <AccordionDetails>
                <Stack spacing={2}>
                  <Box>
                    <Typography variant="subtitle2" color="error" gutterBottom>
                      Error ID:
                    </Typography>
                    <Typography
                      variant="body2"
                      fontFamily="monospace"
                      bgcolor="grey.100"
                      p={1}
                      borderRadius={1}
                    >
                      {this.state.errorId}
                    </Typography>
                  </Box>

                  <Box>
                    <Typography variant="subtitle2" color="error" gutterBottom>
                      Error Message:
                    </Typography>
                    <Typography
                      variant="body2"
                      fontFamily="monospace"
                      bgcolor="grey.100"
                      p={1}
                      borderRadius={1}
                    >
                      {this.state.error.message}
                    </Typography>
                  </Box>

                  {this.state.error.stack && (
                    <Box>
                      <Typography variant="subtitle2" color="error" gutterBottom>
                        Stack Trace:
                      </Typography>
                      <Typography
                        variant="body2"
                        fontFamily="monospace"
                        bgcolor="grey.100"
                        p={1}
                        borderRadius={1}
                        sx={{
                          maxHeight: 200,
                          overflow: 'auto',
                          whiteSpace: 'pre-wrap',
                          fontSize: '0.75rem'
                        }}
                      >
                        {this.state.error.stack}
                      </Typography>
                    </Box>
                  )}

                  <Typography variant="caption" color="text.secondary">
                    If this problem persists, please report this error ID to our support team.
                  </Typography>
                </Stack>
              </AccordionDetails>
            </Accordion>
          </Paper>
        </Box>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;