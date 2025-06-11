import * as fs from 'node:fs/promises';
import * as path from 'node:path';
import * as crypto from 'node:crypto';
import type { BackupInfo, CodeModificationConfig } from './types';

export class BackupManager {
  private backups: Map<string, BackupInfo[]> = new Map();
  private config: CodeModificationConfig;
  private backupDir: string;

  constructor(config: CodeModificationConfig, workspaceRoot: string) {
    this.config = config;
    this.backupDir = path.join(workspaceRoot, config.backupDirectory);
    this.ensureBackupDirectory();
  }

  /**
   * Create a backup of a file before modification
   */
  public async createBackup(
    filePath: string,
    reason = 'Style modification',
  ): Promise<BackupInfo> {
    if (!this.config.enableBackups) {
      throw new Error('Backups are disabled');
    }

    try {
      const content = await fs.readFile(filePath, 'utf-8');
      const hash = this.generateHash(content);
      const timestamp = Date.now();

      const fileName = path.basename(filePath);
      const fileDir = path.dirname(filePath);
      const relativePath = path.relative(process.cwd(), fileDir);

      // Create backup filename with timestamp
      const backupFileName = `${fileName}.${timestamp}.backup`;
      const backupPath = path.join(
        this.backupDir,
        relativePath,
        backupFileName,
      );

      // Ensure backup directory structure exists
      await fs.mkdir(path.dirname(backupPath), { recursive: true });

      // Write backup file
      await fs.writeFile(backupPath, content, 'utf-8');

      const backupInfo: BackupInfo = {
        originalPath: filePath,
        backupPath,
        timestamp,
        hash,
        reason,
      };

      // Store backup info
      const fileBackups = this.backups.get(filePath) || [];
      fileBackups.push(backupInfo);
      this.backups.set(filePath, fileBackups);

      // Clean up old backups if needed
      await this.cleanupOldBackups(filePath);

      return backupInfo;
    } catch (error) {
      throw new Error(
        `Failed to create backup for ${filePath}: ${error instanceof Error ? error.message : String(error)}`,
      );
    }
  }

  /**
   * Restore a file from backup
   */
  public async restoreFromBackup(
    filePath: string,
    backupTimestamp?: number,
  ): Promise<boolean> {
    try {
      const fileBackups = this.backups.get(filePath);
      if (!fileBackups || fileBackups.length === 0) {
        throw new Error(`No backups found for ${filePath}`);
      }

      // Find the backup to restore
      let backupToRestore: BackupInfo;
      if (backupTimestamp) {
        const backup = fileBackups.find((b) => b.timestamp === backupTimestamp);
        if (!backup) {
          throw new Error(`Backup not found for timestamp ${backupTimestamp}`);
        }
        backupToRestore = backup;
      } else {
        // Use the most recent backup
        backupToRestore = fileBackups[fileBackups.length - 1];
      }

      // Read backup content
      const backupContent = await fs.readFile(
        backupToRestore.backupPath,
        'utf-8',
      );

      // Restore the file
      await fs.writeFile(filePath, backupContent, 'utf-8');

      return true;
    } catch (error) {
      console.error(`Failed to restore backup for ${filePath}:`, error);
      return false;
    }
  }

  /**
   * Get backup history for a file
   */
  public getBackupHistory(filePath: string): BackupInfo[] {
    return this.backups.get(filePath) || [];
  }

  /**
   * Check if a backup exists for a file
   */
  public hasBackup(filePath: string): boolean {
    const backups = this.backups.get(filePath);
    return backups !== undefined && backups.length > 0;
  }

  /**
   * Get the most recent backup for a file
   */
  public getLatestBackup(filePath: string): BackupInfo | null {
    const backups = this.backups.get(filePath);
    if (!backups || backups.length === 0) {
      return null;
    }
    return backups[backups.length - 1];
  }

  /**
   * Clean up old backups based on configuration
   */
  private async cleanupOldBackups(filePath: string): Promise<void> {
    const fileBackups = this.backups.get(filePath);
    if (!fileBackups) {
      return;
    }

    // Remove backups exceeding max count
    if (fileBackups.length > this.config.maxBackups) {
      const toRemove = fileBackups.slice(
        0,
        fileBackups.length - this.config.maxBackups,
      );

      for (const backup of toRemove) {
        try {
          await fs.unlink(backup.backupPath);
        } catch (error) {
          console.warn(
            `Failed to delete backup file ${backup.backupPath}:`,
            error,
          );
        }
      }

      // Update the backup list
      this.backups.set(filePath, fileBackups.slice(-this.config.maxBackups));
    }

    // Remove backups older than configured days
    const cutoffTime =
      Date.now() - this.config.autoCleanupDays * 24 * 60 * 60 * 1000;
    const remainingBackups = fileBackups.filter((backup) => {
      if (backup.timestamp < cutoffTime) {
        // Delete the old backup file
        fs.unlink(backup.backupPath).catch((error) =>
          console.warn(
            `Failed to delete old backup file ${backup.backupPath}:`,
            error,
          ),
        );
        return false;
      }
      return true;
    });

    if (remainingBackups.length !== fileBackups.length) {
      this.backups.set(filePath, remainingBackups);
    }
  }

  /**
   * Ensure backup directory exists
   */
  private async ensureBackupDirectory(): Promise<void> {
    try {
      await fs.mkdir(this.backupDir, { recursive: true });
    } catch (error) {
      console.warn(
        `Failed to create backup directory ${this.backupDir}:`,
        error,
      );
    }
  }

  /**
   * Generate hash for file content
   */
  private generateHash(content: string): string {
    return crypto
      .createHash('sha256')
      .update(content)
      .digest('hex')
      .substring(0, 16);
  }

  /**
   * Get all backup information
   */
  public getAllBackups(): Map<string, BackupInfo[]> {
    return new Map(this.backups);
  }

  /**
   * Clear all backup references (but keep files)
   */
  public clearBackupReferences(): void {
    this.backups.clear();
  }

  /**
   * Get backup statistics
   */
  public getBackupStats(): {
    totalFiles: number;
    totalBackups: number;
    oldestBackup: number | null;
    newestBackup: number | null;
  } {
    let totalBackups = 0;
    let oldestBackup: number | null = null;
    let newestBackup: number | null = null;

    for (const fileBackups of this.backups.values()) {
      totalBackups += fileBackups.length;

      for (const backup of fileBackups) {
        if (oldestBackup === null || backup.timestamp < oldestBackup) {
          oldestBackup = backup.timestamp;
        }
        if (newestBackup === null || backup.timestamp > newestBackup) {
          newestBackup = backup.timestamp;
        }
      }
    }

    return {
      totalFiles: this.backups.size,
      totalBackups,
      oldestBackup,
      newestBackup,
    };
  }
}
