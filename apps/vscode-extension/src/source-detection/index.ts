export { SourceDetectionService } from './source-detection-service';
export { FrameworkDetector } from './framework-detector';
export { FileSystemService } from './file-system-service';
export { CacheManager } from './cache-manager';

// Re-export types
export type {
  ElementSourceInfo,
  ComponentHierarchy,
  FrameworkDetectionResult,
  SourceSearchOptions,
  ComponentMatch,
  StyleLocation,
  DetectionCache,
  SourceDetectionConfig,
} from './types';
