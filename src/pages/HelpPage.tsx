import React from 'react';
import {
  Box,
  Typography,
  Paper,
  Container,
  List,
  ListItem,
  ListItemText,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  Chip
} from '@mui/material';
import { ExpandMore } from '@mui/icons-material';
import { ChevronRight } from 'lucide-react';

const HelpPage: React.FC = () => {
  return (
    <Container maxWidth="lg" sx={{ py: 4 }}>
      <Paper elevation={2} sx={{ p: 4, mb: 4 }}>
        <Typography variant="h3" component="h1" gutterBottom align="center">
          Help & Documentation
        </Typography>
        <Typography variant="h6" color="text.secondary" align="center" paragraph>
          Learn how to use Fake Checker effectively
        </Typography>
      </Paper>

      <Box sx={{ mb: 4 }}>
        <Typography variant="h4" gutterBottom>
          Quick Start Guide
        </Typography>

        <Paper elevation={1} sx={{ p: 3, mb: 3 }}>
          <List>
            <ListItem>
              <ChevronRight size={20} />
              <ListItemText
                primary="Upload Images"
                secondary="Drag and drop images or click the upload button in the header"
              />
            </ListItem>
            <ListItem>
              <ChevronRight size={20} />
              <ListItemText
                primary="Wait for Analysis"
                secondary="Our AI will analyze your images automatically"
              />
            </ListItem>
            <ListItem>
              <ChevronRight size={20} />
              <ListItemText
                primary="View Results"
                secondary="See confidence scores and detailed analysis for each image"
              />
            </ListItem>
            <ListItem>
              <ChevronRight size={20} />
              <ListItemText
                primary="Export or Share"
                secondary="Download results or share them with others"
              />
            </ListItem>
          </List>
        </Paper>
      </Box>

      <Box sx={{ mb: 4 }}>
        <Typography variant="h4" gutterBottom>
          Keyboard Shortcuts
        </Typography>

        <Paper elevation={1} sx={{ p: 3, mb: 3 }}>
          <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 2 }}>
            <Chip
              label="Click Logo → Reset & Scroll to Top"
              variant="outlined"
              color="primary"
            />
            <Chip
              label="Escape → Close Mobile Search"
              variant="outlined"
              color="secondary"
            />
            <Chip
              label="Enter → Close Search (if has content)"
              variant="outlined"
              color="secondary"
            />
            <Chip
              label="Drag & Drop → Upload Images"
              variant="outlined"
              color="info"
            />
          </Box>
        </Paper>
      </Box>

      <Box sx={{ mb: 4 }}>
        <Typography variant="h4" gutterBottom>
          Frequently Asked Questions
        </Typography>

        <Box>
          <Accordion>
            <AccordionSummary expandIcon={<ExpandMore />}>
              <Typography variant="h6">How accurate is the AI detection?</Typography>
            </AccordionSummary>
            <AccordionDetails>
              <Typography>
                Our AI detection system achieves high accuracy rates, typically above 90% for most image types.
                However, accuracy can vary depending on image quality, compression, and the sophistication of
                the AI generation model used. Always consider the confidence score provided with each analysis.
              </Typography>
            </AccordionDetails>
          </Accordion>

          <Accordion>
            <AccordionSummary expandIcon={<ExpandMore />}>
              <Typography variant="h6">What image formats are supported?</Typography>
            </AccordionSummary>
            <AccordionDetails>
              <Typography>
                We support all common image formats including JPEG, PNG, WebP, GIF, and BMP.
                For best results, use high-quality, uncompressed images when possible.
              </Typography>
            </AccordionDetails>
          </Accordion>

          <Accordion>
            <AccordionSummary expandIcon={<ExpandMore />}>
              <Typography variant="h6">Is my data safe and private?</Typography>
            </AccordionSummary>
            <AccordionDetails>
              <Typography>
                Yes, absolutely! All image processing happens locally in your browser.
                Your images are never uploaded to our servers, ensuring complete privacy and security.
              </Typography>
            </AccordionDetails>
          </Accordion>

          <Accordion>
            <AccordionSummary expandIcon={<ExpandMore />}>
              <Typography variant="h6">Can I batch process multiple images?</Typography>
            </AccordionSummary>
            <AccordionDetails>
              <Typography>
                Yes! You can upload and analyze multiple images simultaneously.
                Simply select multiple files or drag and drop them all at once.
              </Typography>
            </AccordionDetails>
          </Accordion>

          <Accordion>
            <AccordionSummary expandIcon={<ExpandMore />}>
              <Typography variant="h6">What do the confidence scores mean?</Typography>
            </AccordionSummary>
            <AccordionDetails>
              <Typography>
                Confidence scores indicate how certain the AI is about its prediction:
                <br />• 90-100%: Very confident
                <br />• 70-89%: Confident
                <br />• 50-69%: Somewhat confident
                <br />• Below 50%: Low confidence (uncertain)
              </Typography>
            </AccordionDetails>
          </Accordion>
        </Box>
      </Box>

      <Paper elevation={2} sx={{ p: 4, textAlign: 'center' }}>
        <Typography variant="h5" gutterBottom>
          Need More Help?
        </Typography>
        <Typography color="text.secondary">
          If you have additional questions or need support, feel free to reach out through our contact page.
        </Typography>
      </Paper>
    </Container>
  );
};

export default HelpPage;