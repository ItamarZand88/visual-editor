import * as fs from 'node:fs/promises';
import * as path from 'node:path';
import * as vscode from 'vscode';
import type {
  StyleFramework,
  StyleFrameworkCapabilities,
  StyleFrameworkDetectionResult,
  StyleFrameworkConflict,
  FrameworkRecommendation,
} from './types';

export class StyleFrameworkDetector {
  private workspaceRoot: string;
  private detectionCache: Map<string, StyleFrameworkDetectionResult> =
    new Map();

  constructor(workspaceRoot: string) {
    this.workspaceRoot = workspaceRoot;
  }

  /**
   * Detect all style frameworks in the workspace
   */
  public async detectFrameworks(): Promise<StyleFrameworkDetectionResult> {
    const cacheKey = this.workspaceRoot;
    const cached = this.detectionCache.get(cacheKey);

    if (cached) {
      return cached;
    }

    try {
      const frameworks = await Promise.all([
        this.detectVanillaCSS(),
        this.detectSCSS(),
        this.detectTailwind(),
        this.detectStyledComponents(),
      ]);

      const detectedFrameworks = frameworks.filter((f) => f.isDetected);
      const primary = this.determinePrimaryFramework(detectedFrameworks);
      const conflicts = this.detectConflicts(detectedFrameworks);
      const recommendations = this.generateRecommendations(
        detectedFrameworks,
        conflicts,
      );

      const result: StyleFrameworkDetectionResult = {
        frameworks: detectedFrameworks,
        primary,
        conflicts,
        recommendations,
      };

      this.detectionCache.set(cacheKey, result);
      return result;
    } catch (error) {
      console.error('Error detecting style frameworks:', error);
      return {
        frameworks: [],
        primary: this.getDefaultFramework(),
        conflicts: [],
        recommendations: [],
      };
    }
  }

  /**
   * Detect vanilla CSS usage
   */
  private async detectVanillaCSS(): Promise<StyleFramework> {
    const cssFiles = await this.findFiles('**/*.css');
    const isDetected = cssFiles.length > 0;

    return {
      name: 'vanilla-css',
      isDetected,
      confidence: isDetected ? 0.8 : 0,
      capabilities: this.getVanillaCSSCapabilities(),
    };
  }

  /**
   * Detect SCSS/Sass usage
   */
  private async detectSCSS(): Promise<StyleFramework> {
    const [scssFiles, packageJson] = await Promise.all([
      this.findFiles('**/*.scss'),
      this.readPackageJson(),
    ]);

    const hasFiles = scssFiles.length > 0;
    const hasDependency = this.hasDependency(packageJson, [
      'sass',
      'node-sass',
    ]);
    const configFile = await this.findConfigFile(['.sassrc', 'sass.config.js']);

    const isDetected = hasFiles || hasDependency;
    const confidence = this.calculateConfidence([
      hasFiles,
      hasDependency,
      !!configFile,
    ]);

    return {
      name: 'scss',
      isDetected,
      confidence,
      configFile,
      capabilities: this.getSCSSCapabilities(),
    };
  }

  /**
   * Detect Tailwind CSS usage
   */
  private async detectTailwind(): Promise<StyleFramework> {
    const packageJson = await this.readPackageJson();
    const hasDependency = this.hasDependency(packageJson, ['tailwindcss']);
    const configFile = await this.findConfigFile([
      'tailwind.config.js',
      'tailwind.config.ts',
    ]);

    const isDetected = hasDependency || !!configFile;
    const confidence = this.calculateConfidence([hasDependency, !!configFile]);

    return {
      name: 'tailwind',
      isDetected,
      confidence,
      configFile,
      capabilities: this.getTailwindCapabilities(),
    };
  }

  /**
   * Detect styled-components usage
   */
  private async detectStyledComponents(): Promise<StyleFramework> {
    const packageJson = await this.readPackageJson();
    const hasDependency = this.hasDependency(packageJson, [
      'styled-components',
    ]);

    return {
      name: 'styled-components',
      isDetected: hasDependency,
      confidence: hasDependency ? 0.9 : 0,
      capabilities: this.getStyledComponentsCapabilities(),
    };
  }

  /**
   * Determine the primary framework based on confidence scores
   */
  private determinePrimaryFramework(
    frameworks: StyleFramework[],
  ): StyleFramework {
    if (frameworks.length === 0) {
      return this.getDefaultFramework();
    }

    return frameworks.reduce((primary, current) =>
      current.confidence > primary.confidence ? current : primary,
    );
  }

  /**
   * Detect conflicts between frameworks
   */
  private detectConflicts(
    frameworks: StyleFramework[],
  ): StyleFrameworkConflict[] {
    const conflicts: StyleFrameworkConflict[] = [];

    // Check for CSS-in-JS conflicts
    const cssInJs = frameworks.filter((f) =>
      ['styled-components', 'emotion'].includes(f.name),
    );
    if (cssInJs.length > 1) {
      conflicts.push({
        frameworks: cssInJs.map((f) => f.name),
        type: 'methodology',
        description: 'Multiple CSS-in-JS solutions detected',
        resolution: 'Standardize on one CSS-in-JS library',
      });
    }

    return conflicts;
  }

  /**
   * Generate recommendations based on detected frameworks
   */
  private generateRecommendations(
    frameworks: StyleFramework[],
    conflicts: StyleFrameworkConflict[],
  ): FrameworkRecommendation[] {
    const recommendations: FrameworkRecommendation[] = [];

    // Recommend design system integration
    const hasUtilityFirst = frameworks.some((f) => f.name === 'tailwind');
    if (!hasUtilityFirst && frameworks.length > 0) {
      recommendations.push({
        type: 'optimization',
        description:
          'Consider design system integration for consistent styling',
        benefits: [
          'Consistent design tokens',
          'Reduced CSS bloat',
          'Better maintainability',
        ],
        effort: 'medium',
        priority: 'medium',
      });
    }

    return recommendations;
  }

  /**
   * Helper methods for framework capabilities
   */
  private getVanillaCSSCapabilities(): StyleFrameworkCapabilities {
    return {
      variables: false,
      nesting: false,
      mixins: false,
      functions: false,
      imports: true,
      dynamicGeneration: false,
      themeSupport: false,
      conditionalStyles: false,
    };
  }

  private getSCSSCapabilities(): StyleFrameworkCapabilities {
    return {
      variables: true,
      nesting: true,
      mixins: true,
      functions: true,
      imports: true,
      dynamicGeneration: false,
      themeSupport: true,
      conditionalStyles: true,
    };
  }

  private getStyledComponentsCapabilities(): StyleFrameworkCapabilities {
    return {
      variables: true,
      nesting: true,
      mixins: false,
      functions: true,
      imports: true,
      dynamicGeneration: true,
      themeSupport: true,
      conditionalStyles: true,
    };
  }

  private getTailwindCapabilities(): StyleFrameworkCapabilities {
    return {
      variables: true,
      nesting: true,
      mixins: false,
      functions: true,
      imports: true,
      dynamicGeneration: false,
      themeSupport: true,
      conditionalStyles: true,
    };
  }

  private getDefaultFramework(): StyleFramework {
    return {
      name: 'vanilla-css',
      isDetected: true,
      confidence: 0.5,
      capabilities: this.getVanillaCSSCapabilities(),
    };
  }

  /**
   * Utility methods
   */
  private async findFiles(pattern: string): Promise<string[]> {
    try {
      const files = await vscode.workspace.findFiles(
        pattern,
        '**/node_modules/**',
      );
      return files.map((file) => file.fsPath);
    } catch (error) {
      return [];
    }
  }

  private async readPackageJson(): Promise<any> {
    try {
      const packagePath = path.join(this.workspaceRoot, 'package.json');
      const content = await fs.readFile(packagePath, 'utf-8');
      return JSON.parse(content);
    } catch (error) {
      return {};
    }
  }

  private hasDependency(packageJson: any, dependencies: string[]): boolean {
    const allDeps = {
      ...packageJson.dependencies,
      ...packageJson.devDependencies,
    };

    return dependencies.some((dep) => dep in allDeps);
  }

  private async findConfigFile(
    filenames: string[],
  ): Promise<string | undefined> {
    for (const filename of filenames) {
      try {
        const filePath = path.join(this.workspaceRoot, filename);
        await fs.access(filePath);
        return filePath;
      } catch (error) {
        continue;
      }
    }
    return undefined;
  }

  private calculateConfidence(factors: boolean[]): number {
    const trueCount = factors.filter(Boolean).length;
    return Math.min(0.9, (trueCount / factors.length) * 0.8 + 0.1);
  }

  /**
   * Clear detection cache
   */
  public clearCache(): void {
    this.detectionCache.clear();
  }
}
