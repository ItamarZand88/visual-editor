import type { Request, Response } from 'express';
import {
  CodeModificationService,
  type ElementStyleChanges,
} from '../../code-modification';

export class CodeModificationHandler {
  private codeModificationService: CodeModificationService;

  constructor() {
    this.codeModificationService = CodeModificationService.getInstance();
  }

  /**
   * Apply style changes to source code
   */
  public applyStyles = async (req: Request, res: Response): Promise<void> => {
    try {
      const changes: ElementStyleChanges = req.body;

      if (!this.validateStyleChanges(changes)) {
        res.status(400).json({
          error: 'Invalid style changes data',
          required: ['elementSelector', 'styles'],
        });
        return;
      }

      const result =
        await this.codeModificationService.applyStyleChanges(changes);

      if (result.success) {
        res.json({
          success: true,
          modifiedFiles: result.modifiedFiles,
          backupFiles: result.backupFiles,
          appliedStyles: result.appliedStyles,
          canRollback: result.rollbackInfo?.canRollback || false,
        });
      } else {
        res.status(400).json({
          success: false,
          error: result.error,
        });
      }
    } catch (error) {
      console.error('Error applying styles:', error);
      res.status(500).json({
        error: 'Internal server error',
        details: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  };

  /**
   * Rollback changes to a previous state
   */
  public rollbackChanges = async (
    req: Request,
    res: Response,
  ): Promise<void> => {
    try {
      const { filePath, backupTimestamp } = req.body;

      if (!filePath) {
        res.status(400).json({
          error: 'File path is required for rollback',
        });
        return;
      }

      const success = await this.codeModificationService.rollbackChanges(
        filePath,
        backupTimestamp,
      );

      if (success) {
        res.json({
          success: true,
          message: 'Changes rolled back successfully',
        });
      } else {
        res.status(400).json({
          success: false,
          error: 'Failed to rollback changes',
        });
      }
    } catch (error) {
      console.error('Error rolling back changes:', error);
      res.status(500).json({
        error: 'Internal server error',
        details: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  };

  /**
   * Get backup history for a file
   */
  public getBackupHistory = async (
    req: Request,
    res: Response,
  ): Promise<void> => {
    try {
      const { filePath } = req.query;

      if (!filePath || typeof filePath !== 'string') {
        res.status(400).json({
          error: 'File path is required',
        });
        return;
      }

      const history = this.codeModificationService.getBackupHistory(filePath);

      res.json({
        filePath,
        backups: history.map((backup) => ({
          timestamp: backup.timestamp,
          hash: backup.hash,
          reason: backup.reason,
          backupPath: backup.backupPath,
        })),
      });
    } catch (error) {
      console.error('Error getting backup history:', error);
      res.status(500).json({
        error: 'Internal server error',
        details: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  };

  /**
   * Get current configuration
   */
  public getConfig = async (req: Request, res: Response): Promise<void> => {
    try {
      const config = this.codeModificationService.getConfig();
      res.json(config);
    } catch (error) {
      console.error('Error getting config:', error);
      res.status(500).json({
        error: 'Internal server error',
        details: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  };

  /**
   * Update configuration
   */
  public updateConfig = async (req: Request, res: Response): Promise<void> => {
    try {
      const newConfig = req.body;

      this.codeModificationService.updateConfig(newConfig);

      res.json({
        success: true,
        message: 'Configuration updated successfully',
        config: this.codeModificationService.getConfig(),
      });
    } catch (error) {
      console.error('Error updating config:', error);
      res.status(500).json({
        error: 'Internal server error',
        details: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  };

  /**
   * Get backup statistics
   */
  public getBackupStats = async (
    req: Request,
    res: Response,
  ): Promise<void> => {
    try {
      const stats = this.codeModificationService.getBackupStats();
      res.json(stats || { message: 'No backup data available' });
    } catch (error) {
      console.error('Error getting backup stats:', error);
      res.status(500).json({
        error: 'Internal server error',
        details: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  };

  /**
   * Validate style changes data
   */
  private validateStyleChanges(changes: any): changes is ElementStyleChanges {
    return (
      changes &&
      typeof changes.elementSelector === 'string' &&
      changes.styles &&
      typeof changes.styles === 'object' &&
      Object.keys(changes.styles).length > 0
    );
  }
}
