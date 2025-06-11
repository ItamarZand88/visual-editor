import type {
  StyleGenerationStrategy,
  StyleGenerationInput,
  StyleGenerationOutput,
  StyleGenerationMetadata,
  ResponsiveStyleValue,
  StyleCondition,
} from './types';
import type { DesignTokenManager } from './design-token-manager';

export class StyleGenerator {
  private designTokenManager: DesignTokenManager;
  private generationCache: Map<string, StyleGenerationOutput> = new Map();

  constructor(designTokenManager: DesignTokenManager) {
    this.designTokenManager = designTokenManager;
  }

  /**
   * Generate styles based on strategy and input
   */
  public async generateStyles(
    input: StyleGenerationInput,
    strategy: StyleGenerationStrategy,
  ): Promise<{
    output: StyleGenerationOutput;
    metadata: StyleGenerationMetadata;
  }> {
    const startTime = Date.now();
    const cacheKey = this.getCacheKey(input, strategy);

    // Check cache first
    const cached = this.generationCache.get(cacheKey);
    if (cached) {
      return {
        output: cached,
        metadata: this.createMetadata(strategy, startTime, cached),
      };
    }

    let output: StyleGenerationOutput;

    switch (strategy.framework) {
      case 'vanilla-css':
        output = await this.generateVanillaCSS(input, strategy);
        break;
      case 'scss':
        output = await this.generateSCSS(input, strategy);
        break;
      case 'tailwind':
        output = await this.generateTailwind(input, strategy);
        break;
      case 'styled-components':
        output = await this.generateStyledComponents(input, strategy);
        break;
      case 'css-modules':
        output = await this.generateCSSModules(input, strategy);
        break;
      default:
        output = await this.generateVanillaCSS(input, strategy);
    }

    // Apply optimizations
    if (strategy.optimization.minify) {
      output.css = this.minifyCSS(output.css);
    }

    if (strategy.optimization.sortProperties) {
      output.css = this.sortCSSProperties(output.css);
    }

    // Cache the result
    this.generationCache.set(cacheKey, output);

    return {
      output,
      metadata: this.createMetadata(strategy, startTime, output),
    };
  }

  /**
   * Generate vanilla CSS
   */
  private async generateVanillaCSS(
    input: StyleGenerationInput,
    strategy: StyleGenerationStrategy,
  ): Promise<StyleGenerationOutput> {
    const styles: string[] = [];
    const classes: string[] = [];
    const variables: Record<string, string> = {};

    // Generate base styles
    const baseClass = this.generateClassName('component', strategy.classNaming);
    classes.push(baseClass);

    styles.push(`.${baseClass} {`);

    // Process properties
    for (const [property, value] of Object.entries(input.properties)) {
      if (typeof value === 'string') {
        const processedValue = await this.processValue(
          property,
          value,
          strategy,
        );
        styles.push(`  ${property}: ${processedValue};`);
      } else {
        // Handle responsive values
        const responsiveCSS = this.generateResponsiveCSS(
          property,
          value,
          baseClass,
        );
        styles.push(...responsiveCSS);
      }
    }

    styles.push('}');

    // Add responsive styles
    if (input.conditions) {
      for (const condition of input.conditions) {
        const conditionCSS = this.generateConditionCSS(condition, baseClass);
        styles.push(...conditionCSS);
      }
    }

    return {
      css: styles.join('\n'),
      classes,
      variables,
      imports: [],
      dependencies: [],
    };
  }

  /**
   * Generate SCSS
   */
  private async generateSCSS(
    input: StyleGenerationInput,
    strategy: StyleGenerationStrategy,
  ): Promise<StyleGenerationOutput> {
    const styles: string[] = [];
    const classes: string[] = [];
    const variables: Record<string, string> = {};
    const imports: string[] = [];

    // Add SCSS variables for design tokens
    const designSystem = this.designTokenManager.getDesignSystem();
    if (designSystem) {
      for (const token of designSystem.tokens) {
        variables[`$${token.name}`] = token.value.toString();
        styles.push(`$${token.name}: ${token.value};`);
      }
      styles.push('');
    }

    // Generate component class
    const baseClass = this.generateClassName('component', strategy.classNaming);
    classes.push(baseClass);

    styles.push(`.${baseClass} {`);

    // Process properties with SCSS features
    for (const [property, value] of Object.entries(input.properties)) {
      if (typeof value === 'string') {
        const processedValue = await this.processValueForSCSS(
          property,
          value,
          strategy,
        );
        styles.push(`  ${property}: ${processedValue};`);
      } else {
        // Handle responsive values with SCSS mixins
        const responsiveCSS = this.generateResponsiveSCSS(property, value);
        styles.push(...responsiveCSS);
      }
    }

    styles.push('}');

    return {
      css: styles.join('\n'),
      classes,
      variables,
      imports,
      dependencies: ['sass'],
    };
  }

  /**
   * Generate Tailwind utilities
   */
  private async generateTailwind(
    input: StyleGenerationInput,
    strategy: StyleGenerationStrategy,
  ): Promise<StyleGenerationOutput> {
    const classes: string[] = [];
    const variables: Record<string, string> = {};

    // Convert properties to Tailwind classes
    for (const [property, value] of Object.entries(input.properties)) {
      if (typeof value === 'string') {
        const tailwindClass = this.convertToTailwindClass(property, value);
        if (tailwindClass) {
          classes.push(tailwindClass);
        }
      } else {
        // Handle responsive values
        const responsiveClasses = this.generateResponsiveTailwind(
          property,
          value,
        );
        classes.push(...responsiveClasses);
      }
    }

    // Generate utility CSS for non-standard values
    const customCSS = this.generateCustomTailwindCSS(input, classes);

    return {
      css: customCSS,
      classes,
      variables,
      imports: [],
      dependencies: ['tailwindcss'],
    };
  }

  /**
   * Generate styled-components
   */
  private async generateStyledComponents(
    input: StyleGenerationInput,
    strategy: StyleGenerationStrategy,
  ): Promise<StyleGenerationOutput> {
    const styles: string[] = [];
    const imports = ['import styled from "styled-components";'];
    const variables: Record<string, string> = {};

    // Generate styled component
    styles.push('const StyledComponent = styled.div`');

    // Process properties
    for (const [property, value] of Object.entries(input.properties)) {
      if (typeof value === 'string') {
        const processedValue = await this.processValueForStyledComponents(
          property,
          value,
          strategy,
        );
        styles.push(`  ${property}: ${processedValue};`);
      } else {
        // Handle responsive values
        const responsiveCSS = this.generateResponsiveStyledComponents(
          property,
          value,
        );
        styles.push(...responsiveCSS);
      }
    }

    styles.push('`;');

    return {
      css: styles.join('\n'),
      classes: ['StyledComponent'],
      variables,
      imports,
      dependencies: ['styled-components'],
    };
  }

  /**
   * Generate CSS Modules
   */
  private async generateCSSModules(
    input: StyleGenerationInput,
    strategy: StyleGenerationStrategy,
  ): Promise<StyleGenerationOutput> {
    const styles: string[] = [];
    const classes: string[] = [];
    const variables: Record<string, string> = {};

    // Generate scoped class
    const baseClass = this.generateClassName('component', strategy.classNaming);
    classes.push(baseClass);

    styles.push(`.${baseClass} {`);

    // Process properties
    for (const [property, value] of Object.entries(input.properties)) {
      if (typeof value === 'string') {
        const processedValue = await this.processValue(
          property,
          value,
          strategy,
        );
        styles.push(`  ${property}: ${processedValue};`);
      }
    }

    styles.push('}');

    return {
      css: styles.join('\n'),
      classes,
      variables,
      imports: [],
      dependencies: ['css-loader'],
    };
  }

  /**
   * Helper methods for value processing
   */
  private async processValue(
    property: string,
    value: string,
    strategy: StyleGenerationStrategy,
  ): Promise<string> {
    // Try to find a design token suggestion
    const tokenSuggestion = this.designTokenManager.suggestToken(
      property,
      value,
    );
    if (tokenSuggestion && strategy.optimization.cssnano) {
      return (
        this.designTokenManager.generateTokenUsage(
          property,
          value,
          strategy.framework,
        ) || value
      );
    }

    return value;
  }

  private async processValueForSCSS(
    property: string,
    value: string,
    strategy: StyleGenerationStrategy,
  ): Promise<string> {
    const tokenSuggestion = this.designTokenManager.suggestToken(
      property,
      value,
    );
    if (tokenSuggestion) {
      return `$${tokenSuggestion.name}`;
    }

    return value;
  }

  private async processValueForStyledComponents(
    property: string,
    value: string,
    strategy: StyleGenerationStrategy,
  ): Promise<string> {
    const tokenSuggestion = this.designTokenManager.suggestToken(
      property,
      value,
    );
    if (tokenSuggestion) {
      return `\${props => props.theme.${tokenSuggestion.name} || '${value}'}`;
    }

    return value;
  }

  private convertToTailwindClass(
    property: string,
    value: string,
  ): string | null {
    // Basic Tailwind class mapping
    const classMap: Record<string, (value: string) => string | null> = {
      color: (v) =>
        v === '#000000' ? 'text-black' : v === '#ffffff' ? 'text-white' : null,
      'background-color': (v) =>
        v === '#000000' ? 'bg-black' : v === '#ffffff' ? 'bg-white' : null,
      'font-size': (v) => {
        const sizeMap: Record<string, string> = {
          '12px': 'text-xs',
          '14px': 'text-sm',
          '16px': 'text-base',
          '18px': 'text-lg',
          '20px': 'text-xl',
        };
        return sizeMap[v] || null;
      },
      margin: (v) => (v === '0' ? 'm-0' : null),
      padding: (v) => (v === '0' ? 'p-0' : null),
    };

    const mapper = classMap[property];
    return mapper ? mapper(value) : null;
  }

  private generateResponsiveCSS(
    property: string,
    value: ResponsiveStyleValue,
    baseClass: string,
  ): string[] {
    const styles: string[] = [];

    // Add default value
    styles.push(`  ${property}: ${value.default};`);

    return styles;
  }

  private generateResponsiveSCSS(
    property: string,
    value: ResponsiveStyleValue,
  ): string[] {
    const styles: string[] = [];

    styles.push(`  ${property}: ${value.default};`);

    // Add responsive breakpoints
    for (const [breakpoint, breakpointValue] of Object.entries(
      value.breakpoints,
    )) {
      styles.push(
        `  @media (min-width: ${this.getBreakpointValue(breakpoint)}) {`,
      );
      styles.push(`    ${property}: ${breakpointValue};`);
      styles.push(`  }`);
    }

    return styles;
  }

  private generateResponsiveTailwind(
    property: string,
    value: ResponsiveStyleValue,
  ): string[] {
    const classes: string[] = [];

    // Add default class
    const defaultClass = this.convertToTailwindClass(property, value.default);
    if (defaultClass) {
      classes.push(defaultClass);
    }

    // Add responsive classes
    for (const [breakpoint, breakpointValue] of Object.entries(
      value.breakpoints,
    )) {
      const breakpointClass = this.convertToTailwindClass(
        property,
        breakpointValue,
      );
      if (breakpointClass) {
        classes.push(`${breakpoint}:${breakpointClass}`);
      }
    }

    return classes;
  }

  private generateResponsiveStyledComponents(
    property: string,
    value: ResponsiveStyleValue,
  ): string[] {
    const styles: string[] = [];

    styles.push(`  ${property}: ${value.default};`);

    return styles;
  }

  private generateConditionCSS(
    condition: StyleCondition,
    baseClass: string,
  ): string[] {
    const styles: string[] = [];

    if (condition.type === 'media') {
      styles.push(`@media ${condition.query} {`);
      styles.push(`.${baseClass} {`);

      for (const [property, value] of Object.entries(condition.styles)) {
        styles.push(`    ${property}: ${value};`);
      }

      styles.push('  }');
      styles.push('}');
    }

    return styles;
  }

  private generateCustomTailwindCSS(
    input: StyleGenerationInput,
    classes: string[],
  ): string {
    // Generate custom CSS for values that don't have Tailwind equivalents
    const customStyles: string[] = [];

    for (const [property, value] of Object.entries(input.properties)) {
      if (typeof value === 'string') {
        const hasClass = this.convertToTailwindClass(property, value);
        if (!hasClass) {
          // Generate custom utility
          const utilityName = this.generateUtilityName(property, value);
          customStyles.push(`.${utilityName} { ${property}: ${value}; }`);
          classes.push(utilityName);
        }
      }
    }

    return customStyles.join('\n');
  }

  private generateClassName(
    base: string,
    naming: StyleGenerationStrategy['classNaming'],
  ): string {
    const timestamp = Date.now().toString(36);
    const baseName = `${naming.prefix}${base}${naming.suffix}`;

    switch (naming.caseStyle) {
      case 'camelCase':
        return baseName + timestamp;
      case 'kebab-case':
        return `${baseName.toLowerCase()}-${timestamp}`;
      case 'snake_case':
        return `${baseName.toLowerCase()}_${timestamp}`;
      case 'PascalCase':
        return `${baseName.charAt(0).toUpperCase()}${baseName.slice(1)}${timestamp}`;
      default:
        return baseName + timestamp;
    }
  }

  private generateUtilityName(property: string, value: string): string {
    const hash = this.simpleHash(property + value).toString(36);
    return `utility-${hash}`;
  }

  private getBreakpointValue(breakpoint: string): string {
    const breakpoints: Record<string, string> = {
      sm: '640px',
      md: '768px',
      lg: '1024px',
      xl: '1280px',
    };
    return breakpoints[breakpoint] || '768px';
  }

  private minifyCSS(css: string): string {
    return css
      .replace(/\s+/g, ' ')
      .replace(/;\s*}/g, '}')
      .replace(/{\s*/g, '{')
      .replace(/;\s*/g, ';')
      .trim();
  }

  private sortCSSProperties(css: string): string {
    // Simple property sorting - in a real implementation, this would be more sophisticated
    return css;
  }

  private createMetadata(
    strategy: StyleGenerationStrategy,
    startTime: number,
    output: StyleGenerationOutput,
  ): StyleGenerationMetadata {
    const generationTime = Date.now() - startTime;
    const hash = this.simpleHash(output.css);

    return {
      strategy,
      timestamp: Date.now(),
      hash: hash.toString(36),
      performance: {
        generationTime,
        outputSize: output.css.length,
        optimizationSavings: 0, // Would calculate actual savings
      },
    };
  }

  private getCacheKey(
    input: StyleGenerationInput,
    strategy: StyleGenerationStrategy,
  ): string {
    return this.simpleHash(JSON.stringify({ input, strategy })).toString(36);
  }

  private simpleHash(str: string): number {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = (hash << 5) - hash + char;
      hash = hash & hash; // Convert to 32-bit integer
    }
    return Math.abs(hash);
  }

  /**
   * Clear generation cache
   */
  public clearCache(): void {
    this.generationCache.clear();
  }
}
