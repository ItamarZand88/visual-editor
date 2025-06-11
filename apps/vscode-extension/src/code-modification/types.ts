export interface StyleUpdate {
  property: string;
  value: string;
  unit?: string;
  important?: boolean;
}

export interface ElementStyleChanges {
  elementSelector: string;
  elementId?: string;
  className?: string;
  tagName?: string;
  styles: Record<string, string>;
  sourceInfo?: {
    filePath: string;
    lineNumber: number;
    columnNumber: number;
    componentName: string;
  };
}

export interface FileModification {
  filePath: string;
  originalContent: string;
  modifiedContent: string;
  changeType:
    | 'inline-style'
    | 'css-class'
    | 'styled-components'
    | 'css-modules'
    | 'tailwind';
  timestamp: number;
  backupPath?: string;
}

export interface ModificationResult {
  success: boolean;
  error?: string;
  modifiedFiles: string[];
  backupFiles: string[];
  appliedStyles: Record<string, string>;
  rollbackInfo?: {
    modifications: FileModification[];
    canRollback: boolean;
  };
}

export interface BackupInfo {
  originalPath: string;
  backupPath: string;
  timestamp: number;
  hash: string;
  reason: string;
}

export interface CodeModificationConfig {
  enableBackups: boolean;
  backupDirectory: string;
  maxBackups: number;
  autoCleanupDays: number;
  preferredUpdateMethod:
    | 'inline-style'
    | 'css-class'
    | 'styled-components'
    | 'auto';
  enableLiveReload: boolean;
  conflictResolution: 'ask-user' | 'auto-merge' | 'cancel';
}

export interface ASTModification {
  type: 'jsx-attribute' | 'css-property' | 'styled-component' | 'class-name';
  location: {
    start: number;
    end: number;
    line: number;
    column: number;
  };
  oldValue: string;
  newValue: string;
  property?: string;
}

export interface ConflictDetection {
  hasConflicts: boolean;
  conflicts: Array<{
    type: 'file-changed' | 'merge-conflict' | 'syntax-error';
    filePath: string;
    description: string;
    suggestions?: string[];
  }>;
}

export interface LiveReloadEvent {
  type: 'file-changed' | 'styles-updated' | 'component-reloaded';
  filePath: string;
  changes: Record<string, string>;
  timestamp: number;
}

export interface StyleApplicationStrategy {
  framework: 'react' | 'vue' | 'angular' | 'html';
  method:
    | 'inline-style'
    | 'css-class'
    | 'styled-components'
    | 'css-modules'
    | 'tailwind';
  priority: number;
  canApply: (elementInfo: any, styles: Record<string, string>) => boolean;
  apply: (
    elementInfo: any,
    styles: Record<string, string>,
  ) => Promise<ModificationResult>;
}
