import * as vscode from 'vscode';
import { StyleFrameworkDetector } from './framework-detector';
import { DesignTokenManager } from './design-token-manager';
import { StyleGenerator } from './style-generator';
import type {
  StyleFrameworkDetectionResult,
  StyleGenerationStrategy,
  StyleGenerationInput,
  StyleValidation,
  StyleValidationError,
  StyleValidationWarning,
  StyleSuggestion,
  StylePerformanceMetrics,
  DesignSystem,
  StyleFramework,
} from './types';

export class StyleManagementService {
  private static instance: StyleManagementService;
  private workspaceRoot: string;
  private frameworkDetector: StyleFrameworkDetector;
  private designTokenManager: DesignTokenManager;
  private styleGenerator: StyleGenerator;
  private detectedFrameworks: StyleFrameworkDetectionResult | null = null;

  constructor(workspaceRoot: string) {
    this.workspaceRoot = workspaceRoot;
    this.frameworkDetector = new StyleFrameworkDetector(workspaceRoot);
    this.designTokenManager = new DesignTokenManager(workspaceRoot);
    this.styleGenerator = new StyleGenerator(this.designTokenManager);
  }

  public static getInstance(workspaceRoot?: string): StyleManagementService {
    if (!StyleManagementService.instance && workspaceRoot) {
      StyleManagementService.instance = new StyleManagementService(
        workspaceRoot,
      );
    }
    return StyleManagementService.instance;
  }

  /**
   * Initialize the style management service
   */
  public async initialize(): Promise<void> {
    try {
      console.log('Initializing Style Management Service...');

      // Detect style frameworks
      this.detectedFrameworks = await this.frameworkDetector.detectFrameworks();
      console.log('Detected frameworks:', this.detectedFrameworks.primary.name);

      // Load design system
      await this.designTokenManager.loadDesignSystem();
      console.log('Design system loaded');

      // Show initialization status
      this.showInitializationStatus();
    } catch (error) {
      console.error('Error initializing style management service:', error);
      vscode.window.showErrorMessage(
        'Failed to initialize style management service',
      );
    }
  }

  /**
   * Get detected style frameworks
   */
  public getDetectedFrameworks(): StyleFrameworkDetectionResult | null {
    return this.detectedFrameworks;
  }

  /**
   * Get primary style framework
   */
  public getPrimaryFramework(): StyleFramework | null {
    return this.detectedFrameworks?.primary || null;
  }

  /**
   * Get design system
   */
  public getDesignSystem(): DesignSystem | null {
    return this.designTokenManager.getDesignSystem();
  }

  /**
   * Generate optimal style generation strategy
   */
  public getOptimalStrategy(): StyleGenerationStrategy {
    const primaryFramework = this.getPrimaryFramework();
    const frameworkName = primaryFramework?.name || 'vanilla-css';

    return {
      framework: frameworkName,
      approach: this.getRecommendedApproach(frameworkName),
      outputFormat: this.getRecommendedOutputFormat(frameworkName),
      classNaming: {
        convention: 'bem',
        prefix: 'sw-',
        suffix: '',
        separator: '__',
        caseStyle: 'kebab-case',
      },
      optimization: {
        minify: true,
        purgeUnused: true,
        autoprefixer: true,
        cssnano: false,
        sortProperties: true,
        mergeSelectors: true,
      },
    };
  }

  /**
   * Generate styles with intelligent framework selection
   */
  public async generateIntelligentStyles(
    properties: Record<string, string>,
  ): Promise<{
    css: string;
    classes: string[];
    suggestions: StyleSuggestion[];
    performance: StylePerformanceMetrics;
  }> {
    const strategy = this.getOptimalStrategy();

    // Create generation input
    const input: StyleGenerationInput = {
      properties,
      designTokens: this.designTokenManager.getDesignSystem()?.tokens || [],
    };

    // Generate styles
    const result = await this.styleGenerator.generateStyles(input, strategy);

    // Validate generated styles
    const validation = await this.validateStyles(result.output.css);

    // Generate suggestions
    const suggestions = this.generateStyleSuggestions(properties, strategy);

    return {
      css: result.output.css,
      classes: result.output.classes,
      suggestions,
      performance: validation.performance,
    };
  }

  /**
   * Validate CSS styles
   */
  public async validateStyles(css: string): Promise<StyleValidation> {
    const errors: StyleValidationError[] = [];
    const warnings: StyleValidationWarning[] = [];
    const suggestions: StyleSuggestion[] = [];

    // Basic CSS syntax validation
    const syntaxErrors = this.validateCSSSyntax(css);
    errors.push(...syntaxErrors);

    // Performance validation
    const performanceMetrics = this.calculatePerformanceMetrics(css);

    // Check for common issues
    const commonIssues = this.checkCommonIssues(css);
    warnings.push(...commonIssues);

    // Generate optimization suggestions
    const optimizationSuggestions = this.generateOptimizationSuggestions(css);
    suggestions.push(...optimizationSuggestions);

    return {
      isValid: errors.length === 0,
      errors,
      warnings,
      suggestions,
      performance: performanceMetrics,
    };
  }

  /**
   * Suggest design tokens for CSS properties
   */
  public suggestDesignTokens(
    property: string,
    value: string,
  ): {
    token: string | null;
    confidence: number;
    alternatives: Array<{ token: string; confidence: number }>;
  } {
    const suggestion = this.designTokenManager.suggestToken(property, value);

    if (suggestion) {
      return {
        token: suggestion.name,
        confidence: 0.8,
        alternatives: [],
      };
    }

    // Generate alternatives based on similar values
    const alternatives = this.findSimilarTokens(property, value);

    return {
      token: null,
      confidence: 0,
      alternatives,
    };
  }

  /**
   * Convert styles between frameworks
   */
  public async convertStyles(
    css: string,
    fromFramework: StyleFramework['name'],
    toFramework: StyleFramework['name'],
  ): Promise<{
    convertedCSS: string;
    warnings: string[];
    unmappedProperties: string[];
  }> {
    const warnings: string[] = [];
    const unmappedProperties: string[] = [];

    // Parse CSS properties
    const properties = this.parseCSS(css);

    // Create conversion strategy
    const strategy = this.getOptimalStrategy();
    strategy.framework = toFramework;

    // Generate with new framework
    const input: StyleGenerationInput = {
      properties,
      designTokens: this.designTokenManager.getDesignSystem()?.tokens || [],
    };

    const result = await this.styleGenerator.generateStyles(input, strategy);

    return {
      convertedCSS: result.output.css,
      warnings,
      unmappedProperties,
    };
  }

  /**
   * Get framework-specific recommendations
   */
  public getFrameworkRecommendations(): Array<{
    type: 'optimization' | 'migration' | 'integration';
    description: string;
    benefits: string[];
    effort: 'low' | 'medium' | 'high';
  }> {
    const recommendations = [];
    const frameworks = this.detectedFrameworks;

    if (!frameworks) {
      return [];
    }

    // Check for optimization opportunities
    if (frameworks.primary.name === 'vanilla-css') {
      recommendations.push({
        type: 'optimization' as const,
        description:
          'Consider adopting a CSS preprocessor like SCSS for better maintainability',
        benefits: [
          'Variables and mixins',
          'Better organization',
          'Advanced features',
        ],
        effort: 'medium' as const,
      });
    }

    // Check for design system integration
    const hasDesignSystem =
      this.designTokenManager.getDesignSystem()?.tokens.length || 0 > 5;
    if (!hasDesignSystem) {
      recommendations.push({
        type: 'integration' as const,
        description: 'Implement a design system with consistent tokens',
        benefits: [
          'Consistent design',
          'Faster development',
          'Better maintainability',
        ],
        effort: 'high' as const,
      });
    }

    return recommendations;
  }

  /**
   * Private helper methods
   */
  private getRecommendedApproach(
    framework: StyleFramework['name'],
  ): StyleGenerationStrategy['approach'] {
    switch (framework) {
      case 'tailwind':
        return 'utility-first';
      case 'styled-components':
      case 'emotion':
        return 'css-in-js';
      case 'css-modules':
        return 'component-scoped';
      default:
        return 'class-based';
    }
  }

  private getRecommendedOutputFormat(
    framework: StyleFramework['name'],
  ): StyleGenerationStrategy['outputFormat'] {
    switch (framework) {
      case 'scss':
        return 'scss';
      case 'styled-components':
      case 'emotion':
        return 'js';
      default:
        return 'css';
    }
  }

  private validateCSSSyntax(css: string): StyleValidationError[] {
    const errors: StyleValidationError[] = [];

    // Basic bracket matching
    const openBrackets = (css.match(/{/g) || []).length;
    const closeBrackets = (css.match(/}/g) || []).length;

    if (openBrackets !== closeBrackets) {
      errors.push({
        type: 'syntax',
        message: 'Mismatched curly braces',
        severity: 'error',
      });
    }

    return errors;
  }

  private calculatePerformanceMetrics(css: string): StylePerformanceMetrics {
    const selectors = (css.match(/[^{}]+(?=\s*{)/g) || []).length;
    const declarations = (css.match(/[^{}:]+:[^{}]+(;|})/g) || []).length;

    return {
      selectors,
      declarations,
      specificity: {
        average: 1,
        max: 3,
        problematic: [],
      },
      size: {
        original: css.length,
        compressed: css.length * 0.7, // Estimate
        savings: css.length * 0.3,
      },
      complexity: {
        score: Math.min(100, selectors + declarations),
        factors: [],
      },
    };
  }

  private checkCommonIssues(css: string): StyleValidationWarning[] {
    const warnings: StyleValidationWarning[] = [];

    // Check for !important usage
    if (css.includes('!important')) {
      warnings.push({
        type: 'best-practice',
        property: 'specificity',
        message: 'Avoid using !important for better maintainability',
        suggestion: 'Increase specificity through proper selector hierarchy',
      });
    }

    return warnings;
  }

  private generateOptimizationSuggestions(css: string): StyleSuggestion[] {
    const suggestions: StyleSuggestion[] = [];

    // Suggest design token usage
    if (css.includes('#')) {
      suggestions.push({
        type: 'design-token',
        description: 'Consider using design tokens for colors',
        before: '#007bff',
        after: 'var(--color-primary)',
        impact: 'medium',
      });
    }

    return suggestions;
  }

  private generateStyleSuggestions(
    properties: Record<string, string>,
    strategy: StyleGenerationStrategy,
  ): StyleSuggestion[] {
    const suggestions: StyleSuggestion[] = [];

    // Suggest responsive design
    if (
      Object.keys(properties).some((prop) =>
        ['width', 'height', 'font-size'].includes(prop),
      )
    ) {
      suggestions.push({
        type: 'responsive',
        description:
          'Consider making this responsive across different screen sizes',
        before: 'width: 300px',
        after: 'width: min(300px, 100%)',
        impact: 'high',
      });
    }

    return suggestions;
  }

  private findSimilarTokens(
    property: string,
    value: string,
  ): Array<{ token: string; confidence: number }> {
    // This would implement fuzzy matching for similar tokens
    return [];
  }

  private parseCSS(css: string): Record<string, string> {
    const properties: Record<string, string> = {};
    const matches = css.match(/([^{};]+):\s*([^{};]+)/g) || [];

    matches.forEach((match) => {
      const [property, value] = match.split(':').map((s) => s.trim());
      if (property && value) {
        properties[property] = value;
      }
    });

    return properties;
  }

  private showInitializationStatus(): void {
    if (this.detectedFrameworks) {
      const framework = this.detectedFrameworks.primary.name;
      vscode.window.showInformationMessage(
        `Style Management: Detected ${framework} (${this.detectedFrameworks.frameworks.length} frameworks total)`,
      );
    }
  }

  /**
   * Public utility methods
   */
  public clearCache(): void {
    this.frameworkDetector.clearCache();
    this.styleGenerator.clearCache();
  }

  public async refresh(): Promise<void> {
    this.clearCache();
    await this.initialize();
  }
}
