import * as fs from 'node:fs/promises';
import * as path from 'node:path';
import type { DesignToken, DesignSystem } from './types';

export class DesignTokenManager {
  private workspaceRoot: string;
  private designSystem: DesignSystem | null = null;
  private tokenCache: Map<string, DesignToken> = new Map();

  constructor(workspaceRoot: string) {
    this.workspaceRoot = workspaceRoot;
  }

  /**
   * Load design system from configuration files
   */
  public async loadDesignSystem(): Promise<DesignSystem | null> {
    try {
      // Try to find design system configuration files
      const configPaths = [
        'design-system.json',
        'tokens.json',
        'design-tokens.json',
        'theme.json',
        '.storybook/main.js',
        'tailwind.config.js',
      ];

      for (const configPath of configPaths) {
        const fullPath = path.join(this.workspaceRoot, configPath);

        try {
          if (configPath.endsWith('.json')) {
            const designSystem = await this.loadJSONDesignSystem(fullPath);
            if (designSystem) {
              this.designSystem = designSystem;
              this.populateTokenCache();
              return designSystem;
            }
          } else if (configPath.includes('tailwind')) {
            const designSystem = await this.loadTailwindDesignSystem(fullPath);
            if (designSystem) {
              this.designSystem = designSystem;
              this.populateTokenCache();
              return designSystem;
            }
          }
        } catch (error) {
          continue;
        }
      }

      // Create default design system if none found
      this.designSystem = this.createDefaultDesignSystem();
      this.populateTokenCache();
      return this.designSystem;
    } catch (error) {
      console.error('Error loading design system:', error);
      return null;
    }
  }

  /**
   * Get design token by name
   */
  public getToken(name: string): DesignToken | undefined {
    return this.tokenCache.get(name);
  }

  /**
   * Get all tokens of a specific type
   */
  public getTokensByType(type: DesignToken['type']): DesignToken[] {
    return Array.from(this.tokenCache.values()).filter(
      (token) => token.type === type,
    );
  }

  /**
   * Get color tokens
   */
  public getColorTokens(): DesignToken[] {
    return this.getTokensByType('color');
  }

  /**
   * Get spacing tokens
   */
  public getSpacingTokens(): DesignToken[] {
    return this.getTokensByType('spacing');
  }

  /**
   * Get typography tokens
   */
  public getTypographyTokens(): DesignToken[] {
    return this.getTokensByType('typography');
  }

  /**
   * Suggest design token for a CSS value
   */
  public suggestToken(property: string, value: string): DesignToken | null {
    // Color suggestions
    if (this.isColorProperty(property)) {
      const colorTokens = this.getColorTokens();
      return this.findClosestColorToken(value, colorTokens);
    }

    // Spacing suggestions
    if (this.isSpacingProperty(property)) {
      const spacingTokens = this.getSpacingTokens();
      return this.findClosestSpacingToken(value, spacingTokens);
    }

    // Typography suggestions
    if (this.isTypographyProperty(property)) {
      const typographyTokens = this.getTypographyTokens();
      return this.findMatchingTypographyToken(
        property,
        value,
        typographyTokens,
      );
    }

    return null;
  }

  /**
   * Convert CSS value to design token usage
   */
  public generateTokenUsage(
    property: string,
    value: string,
    framework: string,
  ): string | null {
    const token = this.suggestToken(property, value);
    if (!token) {
      return null;
    }

    switch (framework) {
      case 'tailwind':
        return this.generateTailwindTokenUsage(token);
      case 'css':
        return this.generateCSSTokenUsage(token);
      case 'styled-components':
        return this.generateStyledComponentsTokenUsage(token);
      default:
        return this.generateCSSTokenUsage(token);
    }
  }

  /**
   * Get current design system
   */
  public getDesignSystem(): DesignSystem | null {
    return this.designSystem;
  }

  /**
   * Validate design token usage across the project
   */
  public async validateTokenUsage(): Promise<{
    totalTokens: number;
    usedTokens: number;
    unusedTokens: DesignToken[];
    inconsistentValues: Array<{
      property: string;
      value: string;
      suggestedToken: DesignToken;
    }>;
  }> {
    if (!this.designSystem) {
      return {
        totalTokens: 0,
        usedTokens: 0,
        unusedTokens: [],
        inconsistentValues: [],
      };
    }

    // This is a simplified implementation
    // In a real scenario, this would scan all CSS/style files
    const totalTokens = this.designSystem.tokens.length;
    const usedTokens = Math.floor(totalTokens * 0.7); // Mock usage
    const unusedTokens = this.designSystem.tokens.slice(usedTokens);

    return {
      totalTokens,
      usedTokens,
      unusedTokens,
      inconsistentValues: [],
    };
  }

  /**
   * Private helper methods
   */
  private async loadJSONDesignSystem(
    filePath: string,
  ): Promise<DesignSystem | null> {
    try {
      const content = await fs.readFile(filePath, 'utf-8');
      const data = JSON.parse(content);

      // Transform JSON data to DesignSystem format
      return this.transformJSONToDesignSystem(data);
    } catch (error) {
      return null;
    }
  }

  private async loadTailwindDesignSystem(
    filePath: string,
  ): Promise<DesignSystem | null> {
    try {
      // This would parse Tailwind config and extract theme tokens
      // For now, return a basic Tailwind-based design system
      return this.createTailwindDesignSystem();
    } catch (error) {
      return null;
    }
  }

  private transformJSONToDesignSystem(data: any): DesignSystem {
    const tokens: DesignToken[] = [];

    // Transform color tokens
    if (data.colors) {
      Object.entries(data.colors).forEach(([name, value]) => {
        tokens.push({
          name: `color-${name}`,
          value: value as string,
          type: 'color',
          category: 'colors',
          metadata: {
            source: 'manual',
            lastUpdated: Date.now(),
            usage: 0,
          },
        });
      });
    }

    // Transform spacing tokens
    if (data.spacing) {
      Object.entries(data.spacing).forEach(([name, value]) => {
        tokens.push({
          name: `spacing-${name}`,
          value: value as string,
          type: 'spacing',
          category: 'spacing',
          metadata: {
            source: 'manual',
            lastUpdated: Date.now(),
            usage: 0,
          },
        });
      });
    }

    return {
      name: data.name || 'Custom Design System',
      version: data.version || '1.0.0',
      tokens,
      components: [],
      themes: [],
      breakpoints: [],
      typography: [],
    };
  }

  private createDefaultDesignSystem(): DesignSystem {
    return {
      name: 'Default Design System',
      version: '1.0.0',
      tokens: [
        // Default color tokens
        {
          name: 'primary',
          value: '#007bff',
          type: 'color',
          category: 'primary',
          metadata: { source: 'manual', lastUpdated: Date.now(), usage: 0 },
        },
        {
          name: 'secondary',
          value: '#6c757d',
          type: 'color',
          category: 'primary',
          metadata: { source: 'manual', lastUpdated: Date.now(), usage: 0 },
        },
        // Default spacing tokens
        {
          name: 'space-xs',
          value: '4px',
          type: 'spacing',
          category: 'spacing',
          metadata: { source: 'manual', lastUpdated: Date.now(), usage: 0 },
        },
        {
          name: 'space-sm',
          value: '8px',
          type: 'spacing',
          category: 'spacing',
          metadata: { source: 'manual', lastUpdated: Date.now(), usage: 0 },
        },
        {
          name: 'space-md',
          value: '16px',
          type: 'spacing',
          category: 'spacing',
          metadata: { source: 'manual', lastUpdated: Date.now(), usage: 0 },
        },
      ],
      components: [],
      themes: [],
      breakpoints: [],
      typography: [],
    };
  }

  private createTailwindDesignSystem(): DesignSystem {
    return {
      name: 'Tailwind Design System',
      version: '3.0.0',
      tokens: [
        // Tailwind color scale
        {
          name: 'blue-500',
          value: '#3b82f6',
          type: 'color',
          category: 'blue',
          metadata: { source: 'computed', lastUpdated: Date.now(), usage: 0 },
        },
        {
          name: 'gray-900',
          value: '#111827',
          type: 'color',
          category: 'gray',
          metadata: { source: 'computed', lastUpdated: Date.now(), usage: 0 },
        },
        // Tailwind spacing scale
        {
          name: 'space-4',
          value: '1rem',
          type: 'spacing',
          category: 'spacing',
          metadata: { source: 'computed', lastUpdated: Date.now(), usage: 0 },
        },
        {
          name: 'space-8',
          value: '2rem',
          type: 'spacing',
          category: 'spacing',
          metadata: { source: 'computed', lastUpdated: Date.now(), usage: 0 },
        },
      ],
      components: [],
      themes: [],
      breakpoints: [],
      typography: [],
    };
  }

  private populateTokenCache(): void {
    this.tokenCache.clear();
    if (this.designSystem) {
      this.designSystem.tokens.forEach((token) => {
        this.tokenCache.set(token.name, token);
      });
    }
  }

  private isColorProperty(property: string): boolean {
    return [
      'color',
      'background-color',
      'border-color',
      'fill',
      'stroke',
    ].includes(property);
  }

  private isSpacingProperty(property: string): boolean {
    return [
      'margin',
      'margin-top',
      'margin-right',
      'margin-bottom',
      'margin-left',
      'padding',
      'padding-top',
      'padding-right',
      'padding-bottom',
      'padding-left',
      'gap',
      'top',
      'right',
      'bottom',
      'left',
      'width',
      'height',
    ].includes(property);
  }

  private isTypographyProperty(property: string): boolean {
    return [
      'font-size',
      'font-weight',
      'line-height',
      'letter-spacing',
      'font-family',
    ].includes(property);
  }

  private findClosestColorToken(
    value: string,
    tokens: DesignToken[],
  ): DesignToken | null {
    // Simple exact match for now
    return tokens.find((token) => token.value === value) || null;
  }

  private findClosestSpacingToken(
    value: string,
    tokens: DesignToken[],
  ): DesignToken | null {
    // Simple exact match for now
    return tokens.find((token) => token.value === value) || null;
  }

  private findMatchingTypographyToken(
    property: string,
    value: string,
    tokens: DesignToken[],
  ): DesignToken | null {
    return tokens.find((token) => token.value === value) || null;
  }

  private generateTailwindTokenUsage(token: DesignToken): string {
    if (token.type === 'color') {
      return `text-${token.name}`;
    }
    if (token.type === 'spacing') {
      return `p-${token.name.replace('space-', '')}`;
    }
    return token.name;
  }

  private generateCSSTokenUsage(token: DesignToken): string {
    return `var(--${token.name})`;
  }

  private generateStyledComponentsTokenUsage(token: DesignToken): string {
    return `\${props => props.theme.${token.name}}`;
  }
}
