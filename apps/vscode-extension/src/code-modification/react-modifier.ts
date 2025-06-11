import * as fs from 'node:fs/promises';
import type { ElementStyleChanges, ModificationResult } from './types';
import type { BackupManager } from './backup-manager';

export class ReactModifier {
  private backupManager: BackupManager;

  constructor(backupManager: BackupManager) {
    this.backupManager = backupManager;
  }

  /**
   * Apply style changes to React component file
   */
  public async applyStyles(
    changes: ElementStyleChanges,
    strategy: 'inline-style' | 'css-class' | 'auto' = 'auto',
  ): Promise<ModificationResult> {
    if (!changes.sourceInfo) {
      return {
        success: false,
        error: 'Source information is required for React modifications',
        modifiedFiles: [],
        backupFiles: [],
        appliedStyles: {},
      };
    }

    try {
      // Create backup before modification
      const backup = await this.backupManager.createBackup(
        changes.sourceInfo.filePath,
        'React style modification',
      );

      // Read the current file content
      const originalContent = await fs.readFile(
        changes.sourceInfo.filePath,
        'utf-8',
      );

      // Determine modification strategy
      const selectedStrategy =
        strategy === 'auto'
          ? this.determineOptimalStrategy(originalContent, changes)
          : strategy;

      let modifiedContent: string;
      let appliedStyles: Record<string, string>;

      if (selectedStrategy === 'inline-style') {
        ({ content: modifiedContent, appliedStyles } =
          await this.applyInlineStyles(originalContent, changes));
      } else {
        ({ content: modifiedContent, appliedStyles } =
          await this.applyCSSClassStyles(originalContent, changes));
      }

      // Write the modified content
      await fs.writeFile(changes.sourceInfo.filePath, modifiedContent, 'utf-8');

      return {
        success: true,
        modifiedFiles: [changes.sourceInfo.filePath],
        backupFiles: [backup.backupPath],
        appliedStyles,
        rollbackInfo: {
          modifications: [
            {
              filePath: changes.sourceInfo.filePath,
              originalContent,
              modifiedContent,
              changeType: selectedStrategy,
              timestamp: Date.now(),
              backupPath: backup.backupPath,
            },
          ],
          canRollback: true,
        },
      };
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
   * Apply inline styles to JSX elements
   */
  private async applyInlineStyles(
    content: string,
    changes: ElementStyleChanges,
  ): Promise<{ content: string; appliedStyles: Record<string, string> }> {
    const lines = content.split('\n');
    const targetLine = changes.sourceInfo!.lineNumber - 1; // Convert to 0-based index

    if (targetLine >= lines.length) {
      throw new Error(
        `Target line ${changes.sourceInfo!.lineNumber} is out of range`,
      );
    }

    let currentLine = lines[targetLine];
    const appliedStyles: Record<string, string> = {};

    // Find the JSX element in the line
    const elementPattern = this.buildElementPattern(changes);
    const elementMatch = currentLine.match(elementPattern);

    if (!elementMatch) {
      throw new Error(
        `Could not find element matching ${changes.elementSelector} in target line`,
      );
    }

    // Convert CSS styles to React style object
    const reactStyles = this.convertToReactStyles(changes.styles);

    // Check if element already has a style attribute
    const existingStyleMatch = currentLine.match(/style=\{([^}]+)\}/);

    if (existingStyleMatch) {
      // Merge with existing styles
      const updatedStyles = this.mergeReactStyles(
        existingStyleMatch[1],
        reactStyles,
      );
      currentLine = currentLine.replace(
        /style=\{[^}]+\}/,
        `style={${updatedStyles}}`,
      );
    } else {
      // Add new style attribute
      const styleString = this.formatReactStyles(reactStyles);

      // Insert style attribute before the closing >
      if (currentLine.includes('/>')) {
        // Self-closing tag
        currentLine = currentLine.replace('/>', ` style={${styleString}} />`);
      } else {
        // Opening tag
        currentLine = currentLine.replace('>', ` style={${styleString}}>`);
      }
    }

    lines[targetLine] = currentLine;

    // Mark all styles as applied
    Object.assign(appliedStyles, changes.styles);

    return {
      content: lines.join('\n'),
      appliedStyles,
    };
  }

  /**
   * Apply styles via CSS classes (requires external CSS handling)
   */
  private async applyCSSClassStyles(
    content: string,
    changes: ElementStyleChanges,
  ): Promise<{ content: string; appliedStyles: Record<string, string> }> {
    // For now, this is a placeholder that adds a dynamic class name
    // In a full implementation, this would also create/update CSS files

    const lines = content.split('\n');
    const targetLine = changes.sourceInfo!.lineNumber - 1;

    if (targetLine >= lines.length) {
      throw new Error(
        `Target line ${changes.sourceInfo!.lineNumber} is out of range`,
      );
    }

    let currentLine = lines[targetLine];
    const appliedStyles: Record<string, string> = {};

    // Generate a unique class name based on the styles
    const className = this.generateDynamicClassName(changes.styles);

    // Add the class to the element
    const classNameMatch = currentLine.match(/className=["']([^"']+)["']/);

    if (classNameMatch) {
      // Add to existing className
      const existingClasses = classNameMatch[1];
      currentLine = currentLine.replace(
        /className=["'][^"']+["']/,
        `className="${existingClasses} ${className}"`,
      );
    } else {
      // Add new className attribute
      if (currentLine.includes('/>')) {
        currentLine = currentLine.replace('/>', ` className="${className}" />`);
      } else {
        currentLine = currentLine.replace('>', ` className="${className}">`);
      }
    }

    lines[targetLine] = currentLine;

    // Note: In a complete implementation, we would also create/update CSS files here
    Object.assign(appliedStyles, changes.styles);

    return {
      content: lines.join('\n'),
      appliedStyles,
    };
  }

  /**
   * Determine the optimal modification strategy
   */
  private determineOptimalStrategy(
    content: string,
    changes: ElementStyleChanges,
  ): 'inline-style' | 'css-class' {
    // Simple heuristics for strategy selection
    const hasStyledComponents =
      content.includes('styled-components') || content.includes('emotion');
    const hasCSSModules =
      content.includes('.module.css') || content.includes('.module.scss');
    const styleCount = Object.keys(changes.styles).length;

    // Use inline styles for small style changes or when no CSS framework is detected
    if (styleCount <= 3 && !hasCSSModules && !hasStyledComponents) {
      return 'inline-style';
    }

    // Default to CSS class approach for larger style changes
    return 'css-class';
  }

  /**
   * Build regex pattern to match the target element
   */
  private buildElementPattern(changes: ElementStyleChanges): RegExp {
    const tagName = changes.tagName || 'div';
    let pattern = `<${tagName}\\b`;

    if (changes.elementId) {
      pattern += `[^>]*id=["']${changes.elementId}["']`;
    }

    if (changes.className) {
      // Match any of the classes (handles multiple classes)
      const classes = changes.className.split(' ').filter(Boolean);
      if (classes.length > 0) {
        pattern += `[^>]*className=["'][^"']*\\b(${classes.join('|')})\\b[^"']*["']`;
      }
    }

    return new RegExp(pattern, 'i');
  }

  /**
   * Convert CSS styles to React style object format
   */
  private convertToReactStyles(
    styles: Record<string, string>,
  ): Record<string, string> {
    const reactStyles: Record<string, string> = {};

    for (const [property, value] of Object.entries(styles)) {
      // Convert kebab-case to camelCase
      const reactProperty = property.replace(/-([a-z])/g, (_, letter) =>
        letter.toUpperCase(),
      );
      reactStyles[reactProperty] = value;
    }

    return reactStyles;
  }

  /**
   * Format React styles as a string for JSX
   */
  private formatReactStyles(styles: Record<string, string>): string {
    const styleEntries = Object.entries(styles).map(
      ([key, value]) => `${key}: '${value}'`,
    );
    return `{ ${styleEntries.join(', ')} }`;
  }

  /**
   * Merge new styles with existing React styles
   */
  private mergeReactStyles(
    existingStyleString: string,
    newStyles: Record<string, string>,
  ): string {
    const existingStyles: Record<string, string> = {};

    const stylePattern = /(\w+):\s*['"]?([^,'"]+)['"]?/g;
    let match: RegExpExecArray | null;

    match = stylePattern.exec(existingStyleString);
    while (match !== null) {
      existingStyles[match[1]] = match[2];
      match = stylePattern.exec(existingStyleString);
    }

    const mergedStyles = { ...existingStyles, ...newStyles };

    return this.formatReactStyles(mergedStyles);
  }

  /**
   * Generate a unique class name based on style content
   */
  private generateDynamicClassName(styles: Record<string, string>): string {
    const styleHash = Object.entries(styles)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([key, value]) => `${key}:${value}`)
      .join(';');

    // Create a simple hash
    let hash = 0;
    for (let i = 0; i < styleHash.length; i++) {
      const char = styleHash.charCodeAt(i);
      hash = (hash << 5) - hash + char;
      hash = hash & hash; // Convert to 32-bit integer
    }

    return `stagewise-dynamic-${Math.abs(hash).toString(36)}`;
  }
}
