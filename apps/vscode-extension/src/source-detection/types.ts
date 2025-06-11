export interface ElementSourceInfo {
  filePath: string;
  lineNumber: number;
  columnNumber: number;
  componentName: string;
  framework: 'react' | 'vue' | 'angular' | 'html';
  elementType: 'component' | 'element' | 'fragment';
  confidence: number; // 0-1 score of detection confidence
  additionalInfo?: {
    propsLocation?: { line: number; column: number };
    classNameLocation?: { line: number; column: number };
    styleLocation?: { line: number; column: number };
    importPath?: string;
    moduleType?: 'esm' | 'cjs' | 'ts' | 'jsx' | 'tsx' | 'vue' | 'angular';
  };
}

export interface ComponentHierarchy {
  componentName: string;
  filePath: string;
  framework: 'react' | 'vue' | 'angular' | 'html';
  children: ComponentHierarchy[];
  parent?: ComponentHierarchy;
  depth: number;
  props?: Record<string, unknown>;
  slots?: string[];
}

export interface FrameworkDetectionResult {
  framework: 'react' | 'vue' | 'angular' | 'html';
  confidence: number;
  evidence: string[];
  version?: string;
  buildTool?: 'vite' | 'webpack' | 'next' | 'nuxt' | 'angular-cli' | 'custom';
}

export interface FilePattern {
  pattern: string;
  framework: 'react' | 'vue' | 'angular' | 'html';
  priority: number;
  extensions: string[];
}

export interface SourceSearchOptions {
  rootPath: string;
  excludePatterns?: string[];
  includePatterns?: string[];
  maxDepth?: number;
  frameworks?: ('react' | 'vue' | 'angular' | 'html')[];
  useGitIgnore?: boolean;
}

export interface ComponentMatch {
  filePath: string;
  componentName: string;
  framework: 'react' | 'vue' | 'angular' | 'html';
  confidence: number;
  matchType: 'exact' | 'partial' | 'fuzzy';
  location: {
    line: number;
    column: number;
    endLine: number;
    endColumn: number;
  };
  context: {
    beforeLines: string[];
    matchedLines: string[];
    afterLines: string[];
  };
}

export interface StyleLocation {
  type:
    | 'inline'
    | 'className'
    | 'styled-components'
    | 'css-modules'
    | 'external';
  filePath: string;
  location: {
    line: number;
    column: number;
    endLine?: number;
    endColumn?: number;
  };
  selector?: string;
  property?: string;
  value?: string;
}

export interface DetectionCache {
  timestamp: number;
  workspaceRoot: string;
  framework: FrameworkDetectionResult;
  componentMap: Map<string, ComponentMatch[]>;
  fileHashes: Map<string, string>;
  hierarchyCache: Map<string, ComponentHierarchy>;
}

export interface SourceDetectionConfig {
  enableFrameworkDetection: boolean;
  enableComponentHierarchy: boolean;
  enableStyleDetection: boolean;
  cacheResults: boolean;
  cacheTTL: number; // Time to live in milliseconds
  maxCacheSize: number;
  debugMode: boolean;
}
