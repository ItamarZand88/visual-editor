import * as vscode from 'vscode';
import * as fs from 'node:fs/promises';
import type {
  ElementSourceInfo,
  ComponentHierarchy,
  FrameworkDetectionResult,
  SourceSearchOptions,
  ComponentMatch,
  SourceDetectionConfig,
} from './types';
import { FrameworkDetector } from './framework-detector';
import { ReactDetector } from './detectors/react-detector';
import { VueDetector } from './detectors/vue-detector';
import { AngularDetector } from './detectors/angular-detector';
import { FileSystemService } from './file-system-service';
import { CacheManager } from './cache-manager';

export class SourceDetectionService {
  private static instance: SourceDetectionService;
  private frameworkDetector: FrameworkDetector;
  private reactDetector: ReactDetector;
  private vueDetector: VueDetector;
  private angularDetector: AngularDetector;
  private fileSystemService: FileSystemService;
  private cacheManager: CacheManager;
  private config: SourceDetectionConfig;
  private workspaceRoot: string | null = null;
  private detectedFramework: FrameworkDetectionResult | null = null;

  private constructor() {
    this.frameworkDetector = new FrameworkDetector();
    this.reactDetector = new ReactDetector();
    this.vueDetector = new VueDetector();
    this.angularDetector = new AngularDetector();
    this.fileSystemService = new FileSystemService();
    this.cacheManager = new CacheManager();

    this.config = {
      enableFrameworkDetection: true,
      enableComponentHierarchy: true,
      enableStyleDetection: true,
      cacheResults: true,
      cacheTTL: 5 * 60 * 1000, // 5 minutes
      maxCacheSize: 100,
      debugMode: false,
    };

    this.initializeWorkspace();
  }

  public static getInstance(): SourceDetectionService {
    if (!SourceDetectionService.instance) {
      SourceDetectionService.instance = new SourceDetectionService();
    }
    return SourceDetectionService.instance;
  }

  private async initializeWorkspace(): Promise<void> {
    const workspaceFolders = vscode.workspace.workspaceFolders;
    if (workspaceFolders && workspaceFolders.length > 0) {
      this.workspaceRoot = workspaceFolders[0].uri.fsPath;
      await this.detectFramework();
    }
  }

  private async detectFramework(): Promise<void> {
    if (!this.workspaceRoot) return;

    try {
      this.detectedFramework = await this.frameworkDetector.detectFramework(
        this.workspaceRoot,
      );

      if (this.config.debugMode) {
        console.log(
          '[SourceDetection] Framework detected:',
          this.detectedFramework,
        );
      }
    } catch (error) {
      console.error('[SourceDetection] Framework detection failed:', error);
    }
  }

  /**
   * Main method to find source information for a given element
   */
  public async findElementSource(elementInfo: {
    tagName: string;
    id?: string;
    className?: string;
    textContent?: string;
    attributes?: Record<string, string>;
    parentInfo?: {
      tagName: string;
      className?: string;
      id?: string;
    };
  }): Promise<ElementSourceInfo | null> {
    if (!this.workspaceRoot || !this.detectedFramework) {
      await this.initializeWorkspace();
      if (!this.workspaceRoot || !this.detectedFramework) {
        return null;
      }
    }

    try {
      // Check cache first
      const cacheKey = this.generateCacheKey(elementInfo);
      if (this.config.cacheResults) {
        const cached = this.cacheManager.get<ElementSourceInfo>(cacheKey);
        if (cached) {
          if (this.config.debugMode) {
            console.log('[SourceDetection] Cache hit for element:', cacheKey);
          }
          return cached;
        }
      }

      // Perform detection based on framework
      let sourceInfo: ElementSourceInfo | null = null;

      switch (this.detectedFramework.framework) {
        case 'react':
          sourceInfo = await this.reactDetector.findElementSource(
            elementInfo,
            this.workspaceRoot,
          );
          break;
        case 'vue':
          sourceInfo = await this.vueDetector.findElementSource(
            elementInfo,
            this.workspaceRoot,
          );
          break;
        case 'angular':
          sourceInfo = await this.angularDetector.findElementSource(
            elementInfo,
            this.workspaceRoot,
          );
          break;
        case 'html':
          // Handle static HTML detection
          sourceInfo = await this.findStaticHtmlSource(elementInfo);
          break;
      }

      // Cache the result
      if (sourceInfo && this.config.cacheResults) {
        this.cacheManager.set(cacheKey, sourceInfo, this.config.cacheTTL);
      }

      if (this.config.debugMode) {
        console.log('[SourceDetection] Source found:', sourceInfo);
      }

      return sourceInfo;
    } catch (error) {
      console.error(
        '[SourceDetection] Element source detection failed:',
        error,
      );
      return null;
    }
  }

  /**
   * Build component hierarchy for better context
   */
  public async buildComponentHierarchy(): Promise<ComponentHierarchy | null> {
    if (!this.workspaceRoot || !this.detectedFramework) {
      return null;
    }

    try {
      const cacheKey = `hierarchy_${this.detectedFramework.framework}`;
      if (this.config.cacheResults) {
        const cached = this.cacheManager.get<ComponentHierarchy>(cacheKey);
        if (cached) {
          return cached;
        }
      }

      let hierarchy: ComponentHierarchy | null = null;

      switch (this.detectedFramework.framework) {
        case 'react':
          hierarchy = await this.reactDetector.buildComponentHierarchy(
            this.workspaceRoot,
          );
          break;
        case 'vue':
          hierarchy = await this.vueDetector.buildComponentHierarchy(
            this.workspaceRoot,
          );
          break;
        case 'angular':
          hierarchy = await this.angularDetector.buildComponentHierarchy(
            this.workspaceRoot,
          );
          break;
      }

      if (hierarchy && this.config.cacheResults) {
        this.cacheManager.set(cacheKey, hierarchy, this.config.cacheTTL);
      }

      return hierarchy;
    } catch (error) {
      console.error(
        '[SourceDetection] Component hierarchy building failed:',
        error,
      );
      return null;
    }
  }

  /**
   * Search for components by name or pattern
   */
  public async searchComponents(
    query: string,
    options?: Partial<SourceSearchOptions>,
  ): Promise<ComponentMatch[]> {
    if (!this.workspaceRoot) {
      return [];
    }

    try {
      const searchOptions: SourceSearchOptions = {
        rootPath: this.workspaceRoot,
        excludePatterns: ['node_modules', '.git', 'dist', 'build'],
        maxDepth: 10,
        useGitIgnore: true,
        ...options,
      };

      const results: ComponentMatch[] = [];

      // Search based on detected framework
      if (this.detectedFramework) {
        switch (this.detectedFramework.framework) {
          case 'react':
            results.push(
              ...(await this.reactDetector.searchComponents(
                query,
                searchOptions,
              )),
            );
            break;
          case 'vue':
            results.push(
              ...(await this.vueDetector.searchComponents(
                query,
                searchOptions,
              )),
            );
            break;
          case 'angular':
            results.push(
              ...(await this.angularDetector.searchComponents(
                query,
                searchOptions,
              )),
            );
            break;
        }
      }

      // Sort by confidence score
      results.sort((a, b) => b.confidence - a.confidence);

      return results;
    } catch (error) {
      console.error('[SourceDetection] Component search failed:', error);
      return [];
    }
  }

  /**
   * Get current framework detection result
   */
  public getDetectedFramework(): FrameworkDetectionResult | null {
    return this.detectedFramework;
  }

  /**
   * Update configuration
   */
  public updateConfig(newConfig: Partial<SourceDetectionConfig>): void {
    this.config = { ...this.config, ...newConfig };
  }

  /**
   * Clear all caches
   */
  public clearCache(): void {
    this.cacheManager.clear();
  }

  /**
   * Refresh framework detection
   */
  public async refreshFrameworkDetection(): Promise<void> {
    this.detectedFramework = null;
    await this.detectFramework();
  }

  private generateCacheKey(elementInfo: any): string {
    const keyData = {
      tagName: elementInfo.tagName,
      id: elementInfo.id,
      className: elementInfo.className,
      textContent: elementInfo.textContent?.substring(0, 50), // Limit text length
    };
    return `element_${JSON.stringify(keyData).replace(/[^a-zA-Z0-9]/g, '_')}`;
  }

  private async findStaticHtmlSource(
    elementInfo: any,
  ): Promise<ElementSourceInfo | null> {
    // For static HTML, we'll search for HTML files containing similar patterns
    const htmlFiles = await this.fileSystemService.findFiles(
      this.workspaceRoot!,
      ['**/*.html'],
      ['node_modules', '.git'],
    );

    for (const filePath of htmlFiles) {
      try {
        const content = await fs.readFile(filePath, 'utf-8');
        const lines = content.split('\n');

        for (let i = 0; i < lines.length; i++) {
          const line = lines[i];

          // Simple pattern matching for HTML elements
          if (
            line.includes(`<${elementInfo.tagName}`) &&
            (elementInfo.id ? line.includes(`id="${elementInfo.id}"`) : true) &&
            (elementInfo.className
              ? line.includes(`class="${elementInfo.className}"`)
              : true)
          ) {
            return {
              filePath,
              lineNumber: i + 1,
              columnNumber: line.indexOf(`<${elementInfo.tagName}`) + 1,
              componentName: elementInfo.tagName,
              framework: 'html',
              elementType: 'element',
              confidence: 0.8,
              additionalInfo: {
                moduleType: 'ts',
              },
            };
          }
        }
      } catch (error) {
        console.warn(
          `[SourceDetection] Failed to read HTML file: ${filePath}`,
          error,
        );
      }
    }

    return null;
  }
}
