export const ACCEPTED_IMAGE_TYPES = [
  'image/jpeg',
  'image/jpg',
  'image/png',
  'image/webp',
  'image/gif'
];

export const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB

export const API_ENDPOINTS = {
  HIVE_DETECTION: 'https://api.thehive.ai/api/v2/task/sync',
} as const;

export const DETECTION_THRESHOLDS = {
  HIGH_CONFIDENCE: 0.8,
  MEDIUM_CONFIDENCE: 0.5,
  LOW_CONFIDENCE: 0.2,
} as const;

export const GRID_BREAKPOINTS = {
  xs: 1,
  sm: 2,
  md: 3,
  lg: 4,
  xl: 5,
} as const;