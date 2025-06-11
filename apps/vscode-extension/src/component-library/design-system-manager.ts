import * as fs from 'node:fs/promises';
import type {
  DesignSystemInfo,
  DesignSystemToken,
  DesignSystemTheme,
  DesignGuideline,
} from './types';

export class DesignSystemManager {
  private designSystems: Map<string, DesignSystemInfo> = new Map();
  private tokenCache: Map<string, DesignSystemToken[]> = new Map();
  private themeCache: Map<string, DesignSystemTheme[]> = new Map();

  constructor() {
    this.initializeBuiltInDesignSystems();
  }

  /**
   * Load a design system
   */
  public async loadDesignSystem(designSystem: DesignSystemInfo): Promise<void> {
    console.log(`Loading design system: ${designSystem.name}`);

    this.designSystems.set(designSystem.name, designSystem);
    this.tokenCache.set(designSystem.name, designSystem.tokens);
    this.themeCache.set(designSystem.name, designSystem.themes);
  }

  /**
   * Get design system by name
   */
  public getDesignSystem(name: string): DesignSystemInfo | null {
    return this.designSystems.get(name) || null;
  }

  /**
   * Get all available design systems
   */
  public getAvailableDesignSystems(): DesignSystemInfo[] {
    return Array.from(this.designSystems.values());
  }

  /**
   * Get design tokens for a system
   */
  public getDesignTokens(
    systemName: string,
    category?:
      | 'color'
      | 'spacing'
      | 'typography'
      | 'shadow'
      | 'border'
      | 'animation',
  ): DesignSystemToken[] {
    const tokens = this.tokenCache.get(systemName) || [];

    if (category) {
      return tokens.filter((token) => token.category === category);
    }

    return tokens;
  }

  /**
   * Get themes for a system
   */
  public getThemes(systemName: string): DesignSystemTheme[] {
    return this.themeCache.get(systemName) || [];
  }

  /**
   * Find design token by name or value
   */
  public findToken(
    systemName: string,
    query: string,
    searchBy: 'name' | 'value' | 'both' = 'both',
  ): DesignSystemToken[] {
    const tokens = this.getDesignTokens(systemName);
    const queryLower = query.toLowerCase();

    return tokens.filter((token) => {
      const nameMatch =
        searchBy !== 'value' && token.name.toLowerCase().includes(queryLower);
      const valueMatch =
        searchBy !== 'name' &&
        token.value.toString().toLowerCase().includes(queryLower);

      return nameMatch || valueMatch;
    });
  }

  /**
   * Get token suggestions based on context
   */
  public getTokenSuggestions(
    systemName: string,
    context: {
      property?: string;
      component?: string;
      state?: string;
      category?: string;
    },
  ): DesignSystemToken[] {
    const tokens = this.getDesignTokens(systemName);

    return tokens.filter((token) => {
      // Filter by category if specified
      if (context.category && token.category !== context.category) {
        return false;
      }

      // Filter by usage context
      if (context.property) {
        const propertyKeywords = this.getPropertyKeywords(context.property);
        const hasMatchingUsage = token.usage.some((usage) =>
          propertyKeywords.some((keyword) =>
            usage.toLowerCase().includes(keyword),
          ),
        );

        if (!hasMatchingUsage) {
          return false;
        }
      }

      return true;
    });
  }

  /**
   * Generate CSS variables from design tokens
   */
  public generateCSSVariables(
    systemName: string,
    theme?: string,
    prefix = '--',
  ): string {
    const designSystem = this.getDesignSystem(systemName);

    if (!designSystem) {
      return '';
    }

    let tokens = designSystem.tokens;

    // Apply theme overrides if specified
    if (theme) {
      const themeInfo = designSystem.themes.find((t) => t.name === theme);
      if (themeInfo) {
        tokens = this.applyThemeToTokens(tokens, themeInfo);
      }
    }

    const cssVariables = tokens.map((token) => {
      const variableName = `${prefix}${this.tokenNameToCSSVariable(token.name)}`;
      return `  ${variableName}: ${token.value};`;
    });

    return `:root {\n${cssVariables.join('\n')}\n}`;
  }

  /**
   * Generate SCSS variables from design tokens
   */
  public generateSCSSVariables(
    systemName: string,
    theme?: string,
    prefix = '$',
  ): string {
    const designSystem = this.getDesignSystem(systemName);

    if (!designSystem) {
      return '';
    }

    let tokens = designSystem.tokens;

    // Apply theme if specified
    if (theme) {
      const themeInfo = designSystem.themes.find((t) => t.name === theme);
      if (themeInfo) {
        tokens = this.applyThemeToTokens(tokens, themeInfo);
      }
    }

    const scssVariables = tokens.map((token) => {
      const variableName = `${prefix}${this.tokenNameToSCSSVariable(token.name)}`;
      return `${variableName}: ${token.value};`;
    });

    return scssVariables.join('\n');
  }

  /**
   * Generate JavaScript/TypeScript theme object
   */
  public generateThemeObject(
    systemName: string,
    theme?: string,
    format: 'js' | 'ts' = 'ts',
  ): string {
    const designSystem = this.getDesignSystem(systemName);

    if (!designSystem) {
      return format === 'ts' ? 'export const theme = {};' : 'const theme = {};';
    }

    let tokens = designSystem.tokens;

    // Apply theme if specified
    if (theme) {
      const themeInfo = designSystem.themes.find((t) => t.name === theme);
      if (themeInfo) {
        tokens = this.applyThemeToTokens(tokens, themeInfo);
      }
    }

    // Group tokens by category
    const tokensByCategory = tokens.reduce(
      (acc, token) => {
        if (!acc[token.category]) {
          acc[token.category] = {};
        }

        const tokenKey = this.tokenNameToObjectKey(token.name);
        acc[token.category][tokenKey] = token.value;

        return acc;
      },
      {} as Record<string, Record<string, any>>,
    );

    const themeObject = JSON.stringify(tokensByCategory, null, 2);

    if (format === 'ts') {
      return `export const theme = ${themeObject} as const;`;
    } else {
      return `const theme = ${themeObject};`;
    }
  }

  /**
   * Validate design token usage
   */
  public validateTokenUsage(
    systemName: string,
    cssCode: string,
  ): {
    usedTokens: string[];
    invalidTokens: string[];
    suggestions: Array<{
      invalid: string;
      suggested: string;
      confidence: number;
    }>;
  } {
    const tokens = this.getDesignTokens(systemName);
    const tokenNames = tokens.map((token) =>
      this.tokenNameToCSSVariable(token.name),
    );

    // Extract CSS variable references
    const cssVariableRegex = /var\(--([^)]+)\)/g;
    const usedVariables = new Set<string>();
    let match: RegExpExecArray | null;

    match = cssVariableRegex.exec(cssCode);
    while (match !== null) {
      usedVariables.add(match[1]);
      match = cssVariableRegex.exec(cssCode);
    }

    const usedTokens: string[] = [];
    const invalidTokens: string[] = [];

    for (const variable of usedVariables) {
      if (tokenNames.includes(variable)) {
        usedTokens.push(variable);
      } else {
        invalidTokens.push(variable);
      }
    }

    // Generate suggestions for invalid tokens
    const suggestions = invalidTokens
      .map((invalid) => {
        const bestMatch = this.findBestTokenMatch(invalid, tokenNames);
        return {
          invalid,
          suggested: bestMatch.token,
          confidence: bestMatch.confidence,
        };
      })
      .filter((suggestion) => suggestion.confidence > 0.5);

    return {
      usedTokens,
      invalidTokens,
      suggestions,
    };
  }

  /**
   * Get component-specific design guidelines
   */
  public getComponentGuidelines(
    systemName: string,
    componentName: string,
  ): DesignGuideline[] {
    const designSystem = this.getDesignSystem(systemName);

    if (!designSystem) {
      return [];
    }

    // Find component-specific guidelines
    return designSystem.guidelines.filter(
      (guideline) =>
        guideline.title.toLowerCase().includes(componentName.toLowerCase()) ||
        guideline.description
          .toLowerCase()
          .includes(componentName.toLowerCase()),
    );
  }

  /**
   * Export design system
   */
  public async exportDesignSystem(
    systemName: string,
    outputPath: string,
    format: 'css' | 'scss' | 'js' | 'ts' | 'json',
    theme?: string,
  ): Promise<void> {
    const designSystem = this.getDesignSystem(systemName);

    if (!designSystem) {
      throw new Error(`Design system ${systemName} not found`);
    }

    let content: string;

    switch (format) {
      case 'css':
        content = this.generateCSSVariables(systemName, theme);
        break;
      case 'scss':
        content = this.generateSCSSVariables(systemName, theme);
        break;
      case 'js':
        content = this.generateThemeObject(systemName, theme, 'js');
        break;
      case 'ts':
        content = this.generateThemeObject(systemName, theme, 'ts');
        break;
      case 'json':
        content = JSON.stringify(designSystem, null, 2);
        break;
      default:
        throw new Error(`Unsupported format: ${format}`);
    }

    await fs.writeFile(outputPath, content, 'utf-8');
  }

  /**
   * Initialize built-in design systems
   */
  private initializeBuiltInDesignSystems(): void {
    // Material Design 3
    const materialDesign: DesignSystemInfo = {
      name: 'Material Design',
      version: '3.0',
      tokens: this.getMaterialDesignTokens(),
      themes: this.getMaterialDesignThemes(),
      components: [],
      guidelines: this.getMaterialDesignGuidelines(),
    };

    this.loadDesignSystem(materialDesign);

    // Ant Design tokens
    const antDesign: DesignSystemInfo = {
      name: 'Ant Design',
      version: '5.0',
      tokens: this.getAntDesignTokens(),
      themes: this.getAntDesignThemes(),
      components: [],
      guidelines: [],
    };

    this.loadDesignSystem(antDesign);
  }

  /**
   * Get Material Design tokens
   */
  private getMaterialDesignTokens(): DesignSystemToken[] {
    return [
      // Primary colors
      {
        name: 'primary-10',
        category: 'color',
        value: '#21005D',
        description: 'Primary color shade 10',
        usage: ['background', 'surface'],
      },
      {
        name: 'primary-50',
        category: 'color',
        value: '#6750A4',
        description: 'Primary color shade 50',
        usage: ['button', 'accent'],
      },
      {
        name: 'primary-90',
        category: 'color',
        value: '#EADDFF',
        description: 'Primary color shade 90',
        usage: ['background', 'container'],
      },

      // Spacing tokens
      {
        name: 'spacing-xs',
        category: 'spacing',
        value: '4px',
        description: 'Extra small spacing',
        usage: ['padding', 'margin', 'gap'],
      },
      {
        name: 'spacing-sm',
        category: 'spacing',
        value: '8px',
        description: 'Small spacing',
        usage: ['padding', 'margin', 'gap'],
      },
      {
        name: 'spacing-md',
        category: 'spacing',
        value: '16px',
        description: 'Medium spacing',
        usage: ['padding', 'margin', 'gap'],
      },
      {
        name: 'spacing-lg',
        category: 'spacing',
        value: '24px',
        description: 'Large spacing',
        usage: ['padding', 'margin', 'gap'],
      },

      // Typography tokens
      {
        name: 'font-family-brand',
        category: 'typography',
        value: 'Roboto, sans-serif',
        description: 'Brand font family',
        usage: ['font-family'],
      },
      {
        name: 'font-size-body-medium',
        category: 'typography',
        value: '14px',
        description: 'Body medium font size',
        usage: ['font-size'],
      },
      {
        name: 'font-size-headline-small',
        category: 'typography',
        value: '24px',
        description: 'Small headline font size',
        usage: ['font-size'],
      },
    ];
  }

  /**
   * Get Material Design themes
   */
  private getMaterialDesignThemes(): DesignSystemTheme[] {
    return [
      {
        name: 'light',
        displayName: 'Light Theme',
        isDark: false,
        tokens: {
          'primary-10': '#21005D',
          'primary-50': '#6750A4',
          'primary-90': '#EADDFF',
        },
      },
      {
        name: 'dark',
        displayName: 'Dark Theme',
        isDark: true,
        tokens: {
          'primary-10': '#EADDFF',
          'primary-50': '#D0BCFF',
          'primary-90': '#21005D',
        },
      },
    ];
  }

  /**
   * Get Material Design guidelines
   */
  private getMaterialDesignGuidelines(): DesignGuideline[] {
    return [
      {
        category: 'color',
        title: 'Color Usage',
        description: 'Use primary colors for key actions and accent elements',
        rules: [
          'Primary color should be used sparingly for emphasis',
          'Use tonal variants to create hierarchy',
          'Ensure sufficient contrast for accessibility',
        ],
      },
      {
        category: 'spacing',
        title: 'Spacing System',
        description: 'Use consistent spacing values based on 4px grid',
        rules: [
          'All spacing should be multiples of 4px',
          'Use larger spacing for better touch targets on mobile',
          'Maintain consistent spacing between related elements',
        ],
      },
    ];
  }

  /**
   * Get Ant Design tokens
   */
  private getAntDesignTokens(): DesignSystemToken[] {
    return [
      {
        name: 'blue-6',
        category: 'color',
        value: '#1677ff',
        description: 'Primary blue color',
        usage: ['primary', 'link', 'button'],
      },
      {
        name: 'gray-3',
        category: 'color',
        value: '#f5f5f5',
        description: 'Light gray color',
        usage: ['background', 'border'],
      },
      {
        name: 'font-size-base',
        category: 'typography',
        value: '14px',
        description: 'Base font size',
        usage: ['font-size'],
      },
    ];
  }

  /**
   * Get Ant Design themes
   */
  private getAntDesignThemes(): DesignSystemTheme[] {
    return [
      {
        name: 'default',
        displayName: 'Default Theme',
        isDark: false,
        tokens: {
          'blue-6': '#1677ff',
          'gray-3': '#f5f5f5',
        },
      },
      {
        name: 'dark',
        displayName: 'Dark Theme',
        isDark: true,
        tokens: {
          'blue-6': '#177ddc',
          'gray-3': '#262626',
        },
      },
    ];
  }

  /**
   * Helper methods
   */
  private applyThemeToTokens(
    tokens: DesignSystemToken[],
    theme: DesignSystemTheme,
  ): DesignSystemToken[] {
    return tokens.map((token) => {
      const themeValue = theme.tokens[token.name];

      if (themeValue) {
        return {
          ...token,
          value: themeValue,
        };
      }

      return token;
    });
  }

  private tokenNameToCSSVariable(tokenName: string): string {
    return tokenName.toLowerCase().replace(/[_\s]/g, '-');
  }

  private tokenNameToSCSSVariable(tokenName: string): string {
    return tokenName.toLowerCase().replace(/[-\s]/g, '_');
  }

  private tokenNameToObjectKey(tokenName: string): string {
    return tokenName.replace(/[-_\s]/g, '');
  }

  private getPropertyKeywords(property: string): string[] {
    const keywordMap: Record<string, string[]> = {
      color: ['color', 'background', 'border', 'text'],
      backgroundColor: ['background', 'surface', 'container'],
      padding: ['spacing', 'padding'],
      margin: ['spacing', 'margin'],
      fontSize: ['typography', 'font', 'size'],
      fontFamily: ['typography', 'font', 'family'],
      borderRadius: ['border', 'radius', 'corner'],
      boxShadow: ['shadow', 'elevation'],
    };

    return keywordMap[property] || [property];
  }

  private findBestTokenMatch(
    invalid: string,
    validTokens: string[],
  ): { token: string; confidence: number } {
    let bestMatch = { token: '', confidence: 0 };

    for (const token of validTokens) {
      const confidence = this.calculateStringSimilarity(invalid, token);

      if (confidence > bestMatch.confidence) {
        bestMatch = { token, confidence };
      }
    }

    return bestMatch;
  }

  private calculateStringSimilarity(str1: string, str2: string): number {
    const matrix = Array(str2.length + 1)
      .fill(null)
      .map(() => Array(str1.length + 1).fill(null));

    for (let i = 0; i <= str1.length; i += 1) {
      matrix[0][i] = i;
    }

    for (let j = 0; j <= str2.length; j += 1) {
      matrix[j][0] = j;
    }

    for (let j = 1; j <= str2.length; j += 1) {
      for (let i = 1; i <= str1.length; i += 1) {
        const indicator = str1[i - 1] === str2[j - 1] ? 0 : 1;
        matrix[j][i] = Math.min(
          matrix[j][i - 1] + 1,
          matrix[j - 1][i] + 1,
          matrix[j - 1][i - 1] + indicator,
        );
      }
    }

    const maxLength = Math.max(str1.length, str2.length);
    return (maxLength - matrix[str2.length][str1.length]) / maxLength;
  }
}
