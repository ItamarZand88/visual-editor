import * as vscode from 'vscode';
import type {
  ElementStyleChanges,
  ModificationResult,
  CodeModificationConfig,
  ConflictDetection,
  LiveReloadEvent,
} from './types';
import { BackupManager } from './backup-manager';
import { ReactModifier } from './react-modifier';
import { SourceDetectionService } from '../source-detection';

export class CodeModificationService {
  private static instance: CodeModificationService;
  private backupManager?: BackupManager;
  private reactModifier?: ReactModifier;
  private sourceDetectionService: SourceDetectionService;
  private config: CodeModificationConfig;
  private workspaceRoot: string | null = null;
  private liveReloadListeners: Array<(event: LiveReloadEvent) => void> = [];

  private constructor() {
    this.config = {
      enableBackups: true,
      backupDirectory: '.stagewise-backups',
      maxBackups: 10,
      autoCleanupDays: 7,
      preferredUpdateMethod: 'auto',
      enableLiveReload: true,
      conflictResolution: 'ask-user',
    };

    this.sourceDetectionService = SourceDetectionService.getInstance();
    this.initializeWorkspace();
  }

  public static getInstance(): CodeModificationService {
    if (!CodeModificationService.instance) {
      CodeModificationService.instance = new CodeModificationService();
    }
    return CodeModificationService.instance;
  }

  private async initializeWorkspace(): Promise<void> {
    try {
      const workspaceFolders = vscode.workspace.workspaceFolders;
      if (workspaceFolders && workspaceFolders.length > 0) {
        this.workspaceRoot = workspaceFolders[0].uri.fsPath;
        this.backupManager = new BackupManager(this.config, this.workspaceRoot);
        this.reactModifier = new ReactModifier(this.backupManager);
      }
    } catch (error) {
      console.error('Failed to initialize workspace:', error);
    }
  }

  /**
   * Apply style changes to source code files
   */
  public async applyStyleChanges(
    changes: ElementStyleChanges,
  ): Promise<ModificationResult> {
    if (!this.workspaceRoot) {
      await this.initializeWorkspace();
      if (!this.workspaceRoot) {
        return {
          success: false,
          error: 'No workspace found',
          modifiedFiles: [],
          backupFiles: [],
          appliedStyles: {},
        };
      }
    }

    try {
      // If no source info provided, try to detect it
      if (!changes.sourceInfo) {
        const elementInfo = {
          tagName: changes.tagName || 'div',
          id: changes.elementId,
          className: changes.className,
        };

        const sourceInfo =
          await this.sourceDetectionService.findElementSource(elementInfo);
        if (sourceInfo) {
          changes.sourceInfo = {
            filePath: sourceInfo.filePath,
            lineNumber: sourceInfo.lineNumber,
            columnNumber: sourceInfo.columnNumber,
            componentName: sourceInfo.componentName,
          };
        } else {
          return {
            success: false,
            error: 'Could not find source information for the element',
            modifiedFiles: [],
            backupFiles: [],
            appliedStyles: {},
          };
        }
      }

      // Check for conflicts before applying changes
      const conflictCheck = await this.detectConflicts(changes);
      if (
        conflictCheck.hasConflicts &&
        this.config.conflictResolution === 'cancel'
      ) {
        return {
          success: false,
          error: `Conflicts detected: ${conflictCheck.conflicts.map((c) => c.description).join(', ')}`,
          modifiedFiles: [],
          backupFiles: [],
          appliedStyles: {},
        };
      }

      // Apply changes based on framework
      const detectedFramework =
        this.sourceDetectionService.getDetectedFramework();
      let result: ModificationResult;

      if (detectedFramework?.framework === 'react' && this.reactModifier) {
        const strategy =
          this.config.preferredUpdateMethod === 'auto'
            ? 'auto'
            : (this.config.preferredUpdateMethod as
                | 'inline-style'
                | 'css-class');

        result = await this.reactModifier.applyStyles(changes, strategy);
      } else {
        result = {
          success: false,
          error: 'Unsupported framework or framework not detected',
          modifiedFiles: [],
          backupFiles: [],
          appliedStyles: {},
        };
      }

      // Trigger live reload if successful and enabled
      if (result.success && this.config.enableLiveReload) {
        await this.triggerLiveReload(changes, result);
      }

      return result;
    } catch (error) {
      return {
        success: false,
        error:
          error instanceof Error ? error.message : 'Unknown error occurred',
        modifiedFiles: [],
        backupFiles: [],
        appliedStyles: {},
      };
    }
  }

  /**
   * Rollback changes to previous state
   */
  public async rollbackChanges(
    filePath: string,
    backupTimestamp?: number,
  ): Promise<boolean> {
    if (!this.backupManager) {
      return false;
    }

    try {
      const success = await this.backupManager.restoreFromBackup(
        filePath,
        backupTimestamp,
      );

      if (success && this.config.enableLiveReload) {
        // Trigger reload after rollback
        this.notifyLiveReloadListeners({
          type: 'file-changed',
          filePath,
          changes: {},
          timestamp: Date.now(),
        });
      }

      return success;
    } catch (error) {
      console.error('Failed to rollback changes:', error);
      return false;
    }
  }

  /**
   * Get backup history for a file
   */
  public getBackupHistory(filePath: string) {
    return this.backupManager?.getBackupHistory(filePath) || [];
  }

  /**
   * Detect potential conflicts before applying changes
   */
  private async detectConflicts(
    changes: ElementStyleChanges,
  ): Promise<ConflictDetection> {
    const conflicts: ConflictDetection['conflicts'] = [];

    // Check if file was modified since last backup
    if (changes.sourceInfo && this.backupManager) {
      const latestBackup = this.backupManager.getLatestBackup(
        changes.sourceInfo.filePath,
      );
      if (latestBackup) {
        try {
          const currentContent = await vscode.workspace.fs.readFile(
            vscode.Uri.file(changes.sourceInfo.filePath),
          );
          const crypto = require('node:crypto');
          const currentHash = crypto
            .createHash('sha256')
            .update(currentContent)
            .digest('hex')
            .substring(0, 16);

          if (currentHash !== latestBackup.hash) {
            conflicts.push({
              type: 'file-changed',
              filePath: changes.sourceInfo.filePath,
              description: 'File has been modified since last backup',
              suggestions: ['Create a new backup before proceeding'],
            });
          }
        } catch (error) {
          conflicts.push({
            type: 'file-changed',
            filePath: changes.sourceInfo.filePath,
            description: 'Could not read file to check for changes',
          });
        }
      }
    }

    return {
      hasConflicts: conflicts.length > 0,
      conflicts,
    };
  }

  /**
   * Trigger live reload in the browser
   */
  private async triggerLiveReload(
    changes: ElementStyleChanges,
    result: ModificationResult,
  ): Promise<void> {
    const reloadEvent: LiveReloadEvent = {
      type: 'styles-updated',
      filePath: changes.sourceInfo?.filePath || '',
      changes: result.appliedStyles,
      timestamp: Date.now(),
    };

    this.notifyLiveReloadListeners(reloadEvent);
  }

  /**
   * Add a live reload listener
   */
  public addLiveReloadListener(
    listener: (event: LiveReloadEvent) => void,
  ): void {
    this.liveReloadListeners.push(listener);
  }

  /**
   * Remove a live reload listener
   */
  public removeLiveReloadListener(
    listener: (event: LiveReloadEvent) => void,
  ): void {
    const index = this.liveReloadListeners.indexOf(listener);
    if (index > -1) {
      this.liveReloadListeners.splice(index, 1);
    }
  }

  /**
   * Notify all live reload listeners
   */
  private notifyLiveReloadListeners(event: LiveReloadEvent): void {
    for (const listener of this.liveReloadListeners) {
      try {
        listener(event);
      } catch (error) {
        console.error('Error in live reload listener:', error);
      }
    }
  }

  /**
   * Update configuration
   */
  public updateConfig(newConfig: Partial<CodeModificationConfig>): void {
    this.config = { ...this.config, ...newConfig };

    // Reinitialize components if needed
    if (this.workspaceRoot && newConfig.backupDirectory) {
      this.backupManager = new BackupManager(this.config, this.workspaceRoot);
      if (this.backupManager) {
        this.reactModifier = new ReactModifier(this.backupManager);
      }
    }
  }

  /**
   * Get current configuration
   */
  public getConfig(): CodeModificationConfig {
    return { ...this.config };
  }

  /**
   * Get backup statistics
   */
  public getBackupStats() {
    return this.backupManager?.getBackupStats() || null;
  }
}
