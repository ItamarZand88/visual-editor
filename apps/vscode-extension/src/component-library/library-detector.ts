import * as fs from 'node:fs/promises';
import * as path from 'node:path';
import * as vscode from 'vscode';
import type {
  ComponentLibrary,
  ComponentLibraryDetectionResult,
  ComponentLibraryMetadata,
  LibraryIntegration,
  LibraryConflict,
  LibraryRecommendation,
  CrossLibraryCompatibility,
} from './types';

export class ComponentLibraryDetector {
  private workspaceRoot: string;
  private detectionCache: Map<string, ComponentLibraryDetectionResult> =
    new Map();

  constructor(workspaceRoot: string) {
    this.workspaceRoot = workspaceRoot;
  }

  /**
   * Detect all component libraries in the workspace
   */
  public async detectLibraries(): Promise<ComponentLibraryDetectionResult> {
    const cacheKey = this.workspaceRoot;
    const cached = this.detectionCache.get(cacheKey);

    if (cached) {
      return cached;
    }

    try {
      console.log('Detecting component libraries...');

      const libraries = await Promise.all([
        this.detectMaterialUI(),
        this.detectAntDesign(),
        this.detectChakraUI(),
        this.detectReactBootstrap(),
        this.detectMantine(),
        this.detectShadcnUI(),
        this.detectNextUI(),
        this.detectElementPlus(),
        this.detectVuetify(),
      ]);

      const detectedLibraries = libraries.filter((lib) => lib.isDetected);
      const primary = this.determinePrimaryLibrary(detectedLibraries);
      const conflicts = this.detectConflicts(detectedLibraries);
      const compatibility = this.analyzeCompatibility(detectedLibraries);
      const recommendations = this.generateRecommendations(
        detectedLibraries,
        conflicts,
      );

      const result: ComponentLibraryDetectionResult = {
        libraries: detectedLibraries,
        primary,
        conflicts,
        recommendations,
        compatibility,
      };

      this.detectionCache.set(cacheKey, result);
      return result;
    } catch (error) {
      console.error('Error detecting component libraries:', error);
      return {
        libraries: [],
        conflicts: [],
        recommendations: [],
        compatibility: { compatible: true, issues: [], solutions: [] },
      };
    }
  }

  /**
   * Detect Material-UI / MUI
   */
  private async detectMaterialUI(): Promise<ComponentLibrary> {
    const packageJson = await this.readPackageJson();
    const hasMui = this.hasDependency(packageJson, [
      '@mui/material',
      '@material-ui/core',
    ]);
    const hasUsage = await this.searchInFiles('Material-UI', [
      '**/*.tsx',
      '**/*.jsx',
    ]);

    const isDetected = hasMui || hasUsage;
    const confidence = this.calculateConfidence([hasMui, hasUsage]);

    return {
      name: 'material-ui',
      packageName: '@mui/material',
      version:
        this.getPackageVersion(packageJson, '@mui/material') ||
        this.getPackageVersion(packageJson, '@material-ui/core'),
      isDetected,
      confidence,
      metadata: this.getMaterialUIMetadata(),
      components: [],
      designSystem: {
        name: 'Material Design',
        version: '3.0',
        tokens: [],
        themes: [],
        components: [],
        guidelines: [],
      },
      integration: this.getMaterialUIIntegration(),
    };
  }

  /**
   * Detect Ant Design
   */
  private async detectAntDesign(): Promise<ComponentLibrary> {
    const packageJson = await this.readPackageJson();
    const hasAntd = this.hasDependency(packageJson, ['antd']);
    const hasUsage = await this.searchInFiles('antd', ['**/*.tsx', '**/*.jsx']);

    const isDetected = hasAntd || hasUsage;
    const confidence = this.calculateConfidence([hasAntd, hasUsage]);

    return {
      name: 'ant-design',
      packageName: 'antd',
      version: this.getPackageVersion(packageJson, 'antd'),
      isDetected,
      confidence,
      metadata: this.getAntDesignMetadata(),
      components: [],
      integration: this.getAntDesignIntegration(),
    };
  }

  /**
   * Detect Chakra UI
   */
  private async detectChakraUI(): Promise<ComponentLibrary> {
    const packageJson = await this.readPackageJson();
    const hasChakra = this.hasDependency(packageJson, [
      '@chakra-ui/react',
      '@chakra-ui/core',
    ]);
    const hasUsage = await this.searchInFiles('@chakra-ui', [
      '**/*.tsx',
      '**/*.jsx',
    ]);

    const isDetected = hasChakra || hasUsage;
    const confidence = this.calculateConfidence([hasChakra, hasUsage]);

    return {
      name: 'chakra-ui',
      packageName: '@chakra-ui/react',
      version: this.getPackageVersion(packageJson, '@chakra-ui/react'),
      isDetected,
      confidence,
      metadata: this.getChakraUIMetadata(),
      components: [],
      integration: this.getChakraUIIntegration(),
    };
  }

  /**
   * Detect React Bootstrap
   */
  private async detectReactBootstrap(): Promise<ComponentLibrary> {
    const packageJson = await this.readPackageJson();
    const hasBootstrap = this.hasDependency(packageJson, [
      'react-bootstrap',
      'bootstrap',
    ]);
    const hasUsage = await this.searchInFiles('react-bootstrap', [
      '**/*.tsx',
      '**/*.jsx',
    ]);

    const isDetected = hasBootstrap || hasUsage;
    const confidence = this.calculateConfidence([hasBootstrap, hasUsage]);

    return {
      name: 'react-bootstrap',
      packageName: 'react-bootstrap',
      version: this.getPackageVersion(packageJson, 'react-bootstrap'),
      isDetected,
      confidence,
      metadata: this.getReactBootstrapMetadata(),
      components: [],
      integration: this.getReactBootstrapIntegration(),
    };
  }

  /**
   * Detect Mantine
   */
  private async detectMantine(): Promise<ComponentLibrary> {
    const packageJson = await this.readPackageJson();
    const hasMantine = this.hasDependency(packageJson, ['@mantine/core']);
    const hasUsage = await this.searchInFiles('@mantine', [
      '**/*.tsx',
      '**/*.jsx',
    ]);

    const isDetected = hasMantine || hasUsage;
    const confidence = this.calculateConfidence([hasMantine, hasUsage]);

    return {
      name: 'mantine',
      packageName: '@mantine/core',
      version: this.getPackageVersion(packageJson, '@mantine/core'),
      isDetected,
      confidence,
      metadata: this.getMantineMetadata(),
      components: [],
      integration: this.getMantineIntegration(),
    };
  }

  /**
   * Detect Shadcn/UI
   */
  private async detectShadcnUI(): Promise<ComponentLibrary> {
    const hasConfig = await this.findConfigFile(['components.json']);
    const hasUsage = await this.searchInFiles('shadcn', [
      '**/*.tsx',
      '**/*.jsx',
    ]);
    const hasComponents = await this.checkShadcnComponents();

    const isDetected = !!hasConfig || hasUsage || hasComponents;
    const confidence = this.calculateConfidence([
      !!hasConfig,
      hasUsage,
      hasComponents,
    ]);

    return {
      name: 'shadcn-ui',
      packageName: 'shadcn/ui',
      isDetected,
      confidence,
      metadata: this.getShadcnUIMetadata(),
      components: [],
      integration: this.getShadcnUIIntegration(),
    };
  }

  /**
   * Detect Next UI
   */
  private async detectNextUI(): Promise<ComponentLibrary> {
    const packageJson = await this.readPackageJson();
    const hasNextUI = this.hasDependency(packageJson, ['@nextui-org/react']);
    const hasUsage = await this.searchInFiles('@nextui-org', [
      '**/*.tsx',
      '**/*.jsx',
    ]);

    const isDetected = hasNextUI || hasUsage;
    const confidence = this.calculateConfidence([hasNextUI, hasUsage]);

    return {
      name: 'next-ui',
      packageName: '@nextui-org/react',
      version: this.getPackageVersion(packageJson, '@nextui-org/react'),
      isDetected,
      confidence,
      metadata: this.getNextUIMetadata(),
      components: [],
      integration: this.getNextUIIntegration(),
    };
  }

  /**
   * Detect Element Plus (Vue)
   */
  private async detectElementPlus(): Promise<ComponentLibrary> {
    const packageJson = await this.readPackageJson();
    const hasElementPlus = this.hasDependency(packageJson, ['element-plus']);
    const hasUsage = await this.searchInFiles('element-plus', ['**/*.vue']);

    const isDetected = hasElementPlus || hasUsage;
    const confidence = this.calculateConfidence([hasElementPlus, hasUsage]);

    return {
      name: 'element-plus',
      packageName: 'element-plus',
      version: this.getPackageVersion(packageJson, 'element-plus'),
      isDetected,
      confidence,
      metadata: this.getElementPlusMetadata(),
      components: [],
      integration: this.getElementPlusIntegration(),
    };
  }

  /**
   * Detect Vuetify
   */
  private async detectVuetify(): Promise<ComponentLibrary> {
    const packageJson = await this.readPackageJson();
    const hasVuetify = this.hasDependency(packageJson, ['vuetify']);
    const hasUsage = await this.searchInFiles('vuetify', ['**/*.vue']);

    const isDetected = hasVuetify || hasUsage;
    const confidence = this.calculateConfidence([hasVuetify, hasUsage]);

    return {
      name: 'vuetify',
      packageName: 'vuetify',
      version: this.getPackageVersion(packageJson, 'vuetify'),
      isDetected,
      confidence,
      metadata: this.getVuetifyMetadata(),
      components: [],
      integration: this.getVuetifyIntegration(),
    };
  }

  /**
   * Helper methods for library metadata
   */
  private getMaterialUIMetadata(): ComponentLibraryMetadata {
    return {
      displayName: 'Material-UI (MUI)',
      description: "React components implementing Google's Material Design",
      framework: 'react',
      category: 'design-system',
      features: [
        { name: 'Material Design', type: 'styling', supported: true },
        { name: 'Theming', type: 'theming', supported: true },
        { name: 'Accessibility', type: 'accessibility', supported: true },
        { name: 'Responsive', type: 'responsive', supported: true },
      ],
      documentation: {
        url: 'https://mui.com/',
        apiReference: 'https://mui.com/api/',
        examples: 'https://mui.com/components/',
      },
      repository: {
        url: 'https://github.com/mui/material-ui',
        stars: 90000,
      },
    };
  }

  private getAntDesignMetadata(): ComponentLibraryMetadata {
    return {
      displayName: 'Ant Design',
      description: 'Enterprise-class UI design language and React components',
      framework: 'react',
      category: 'design-system',
      features: [
        { name: 'Enterprise Design', type: 'styling', supported: true },
        { name: 'Theming', type: 'theming', supported: true },
        {
          name: 'Internationalization',
          type: 'accessibility',
          supported: true,
        },
      ],
      documentation: {
        url: 'https://ant.design/',
        apiReference: 'https://ant.design/components/',
      },
      repository: {
        url: 'https://github.com/ant-design/ant-design',
        stars: 90000,
      },
    };
  }

  private getChakraUIMetadata(): ComponentLibraryMetadata {
    return {
      displayName: 'Chakra UI',
      description: 'Modular and accessible component library for React',
      framework: 'react',
      category: 'ui-library',
      features: [
        { name: 'Modular', type: 'styling', supported: true },
        { name: 'Accessibility', type: 'accessibility', supported: true },
        { name: 'Dark Mode', type: 'theming', supported: true },
      ],
      documentation: {
        url: 'https://chakra-ui.com/',
      },
      repository: {
        url: 'https://github.com/chakra-ui/chakra-ui',
        stars: 35000,
      },
    };
  }

  private getReactBootstrapMetadata(): ComponentLibraryMetadata {
    return {
      displayName: 'React Bootstrap',
      description: 'Bootstrap components built for React',
      framework: 'react',
      category: 'ui-library',
      features: [
        { name: 'Bootstrap Styling', type: 'styling', supported: true },
        { name: 'Responsive', type: 'responsive', supported: true },
      ],
      documentation: {
        url: 'https://react-bootstrap.github.io/',
      },
      repository: {
        url: 'https://github.com/react-bootstrap/react-bootstrap',
        stars: 22000,
      },
    };
  }

  private getMantineMetadata(): ComponentLibraryMetadata {
    return {
      displayName: 'Mantine',
      description: 'Full-featured React components and hooks library',
      framework: 'react',
      category: 'ui-library',
      features: [
        { name: 'Full Featured', type: 'styling', supported: true },
        { name: 'Dark Theme', type: 'theming', supported: true },
        { name: 'TypeScript', type: 'accessibility', supported: true },
      ],
      documentation: {
        url: 'https://mantine.dev/',
      },
      repository: {
        url: 'https://github.com/mantinedev/mantine',
        stars: 24000,
      },
    };
  }

  private getShadcnUIMetadata(): ComponentLibraryMetadata {
    return {
      displayName: 'Shadcn/UI',
      description:
        'Beautiful designed components built using Radix UI and Tailwind CSS',
      framework: 'react',
      category: 'component-collection',
      features: [
        { name: 'Copy & Paste', type: 'styling', supported: true },
        { name: 'Tailwind CSS', type: 'theming', supported: true },
        { name: 'Radix UI', type: 'accessibility', supported: true },
      ],
      documentation: {
        url: 'https://ui.shadcn.com/',
      },
      repository: {
        url: 'https://github.com/shadcn-ui/ui',
        stars: 45000,
      },
    };
  }

  private getNextUIMetadata(): ComponentLibraryMetadata {
    return {
      displayName: 'NextUI',
      description: 'Beautiful, fast and modern React UI library',
      framework: 'react',
      category: 'ui-library',
      features: [
        { name: 'Modern Design', type: 'styling', supported: true },
        { name: 'Dark Mode', type: 'theming', supported: true },
        { name: 'TypeScript', type: 'accessibility', supported: true },
      ],
      documentation: {
        url: 'https://nextui.org/',
      },
      repository: {
        url: 'https://github.com/nextui-org/nextui',
        stars: 18000,
      },
    };
  }

  private getElementPlusMetadata(): ComponentLibraryMetadata {
    return {
      displayName: 'Element Plus',
      description: 'Vue 3 UI library',
      framework: 'vue',
      category: 'ui-library',
      features: [
        { name: 'Vue 3', type: 'styling', supported: true },
        { name: 'TypeScript', type: 'accessibility', supported: true },
      ],
      documentation: {
        url: 'https://element-plus.org/',
      },
      repository: {
        url: 'https://github.com/element-plus/element-plus',
        stars: 23000,
      },
    };
  }

  private getVuetifyMetadata(): ComponentLibraryMetadata {
    return {
      displayName: 'Vuetify',
      description: 'Material Design component framework for Vue.js',
      framework: 'vue',
      category: 'design-system',
      features: [
        { name: 'Material Design', type: 'styling', supported: true },
        { name: 'Responsive', type: 'responsive', supported: true },
      ],
      documentation: {
        url: 'https://vuetifyjs.com/',
      },
      repository: {
        url: 'https://github.com/vuetifyjs/vuetify',
        stars: 39000,
      },
    };
  }

  /**
   * Helper methods for library integrations
   */
  private getMaterialUIIntegration(): LibraryIntegration {
    return {
      importStrategy: {
        type: 'named',
        modulePath: '@mui/material',
        treeshaking: true,
      },
      themeIntegration: {
        supported: true,
        themeProvider: 'ThemeProvider',
        customization: {
          colors: true,
          typography: true,
          spacing: true,
          components: true,
        },
      },
      styleStrategy: {
        approach: 'css-in-js',
        runtime: true,
        ssr: true,
        optimization: {
          criticalCSS: true,
          purgeCSS: false,
          autoprefixer: true,
        },
      },
      customization: {
        themes: [],
        variants: [],
        globalStyles: true,
        componentOverrides: true,
        cssVariables: false,
      },
      compatibility: {
        react: {
          minVersion: '17.0.0',
          hooks: true,
          concurrent: true,
        },
        typescript: true,
        nextjs: {
          supported: true,
          ssr: true,
          staticExport: true,
        },
      },
    };
  }

  private getAntDesignIntegration(): LibraryIntegration {
    return {
      importStrategy: {
        type: 'named',
        modulePath: 'antd',
        treeshaking: true,
      },
      themeIntegration: {
        supported: true,
        themeProvider: 'ConfigProvider',
        customization: {
          colors: true,
          typography: true,
          spacing: true,
          components: true,
        },
      },
      styleStrategy: {
        approach: 'css',
        runtime: false,
        ssr: true,
        optimization: {
          criticalCSS: true,
          purgeCSS: true,
          autoprefixer: true,
        },
      },
      customization: {
        themes: [],
        variants: [],
        globalStyles: true,
        componentOverrides: true,
        cssVariables: true,
      },
      compatibility: {
        react: {
          minVersion: '16.9.0',
          hooks: true,
          concurrent: true,
        },
        typescript: true,
      },
    };
  }

  private getChakraUIIntegration(): LibraryIntegration {
    return {
      importStrategy: {
        type: 'named',
        modulePath: '@chakra-ui/react',
        treeshaking: true,
      },
      themeIntegration: {
        supported: true,
        themeProvider: 'ChakraProvider',
        customization: {
          colors: true,
          typography: true,
          spacing: true,
          components: true,
        },
      },
      styleStrategy: {
        approach: 'css-in-js',
        runtime: true,
        ssr: true,
        optimization: {
          criticalCSS: true,
          purgeCSS: false,
          autoprefixer: true,
        },
      },
      customization: {
        themes: [],
        variants: [],
        globalStyles: true,
        componentOverrides: true,
        cssVariables: false,
      },
      compatibility: {
        react: {
          minVersion: '18.0.0',
          hooks: true,
          concurrent: true,
        },
        typescript: true,
      },
    };
  }

  private getReactBootstrapIntegration(): LibraryIntegration {
    return {
      importStrategy: {
        type: 'named',
        modulePath: 'react-bootstrap',
        treeshaking: true,
      },
      themeIntegration: {
        supported: false,
        customization: {
          colors: false,
          typography: false,
          spacing: false,
          components: false,
        },
      },
      styleStrategy: {
        approach: 'css',
        runtime: false,
        ssr: true,
        optimization: {
          criticalCSS: true,
          purgeCSS: true,
          autoprefixer: true,
        },
      },
      customization: {
        themes: [],
        variants: [],
        globalStyles: true,
        componentOverrides: false,
        cssVariables: false,
      },
      compatibility: {
        react: {
          minVersion: '16.14.0',
          hooks: true,
          concurrent: false,
        },
        typescript: true,
      },
    };
  }

  private getMantineIntegration(): LibraryIntegration {
    return {
      importStrategy: {
        type: 'named',
        modulePath: '@mantine/core',
        treeshaking: true,
      },
      themeIntegration: {
        supported: true,
        themeProvider: 'MantineProvider',
        customization: {
          colors: true,
          typography: true,
          spacing: true,
          components: true,
        },
      },
      styleStrategy: {
        approach: 'css-in-js',
        runtime: true,
        ssr: true,
        optimization: {
          criticalCSS: true,
          purgeCSS: false,
          autoprefixer: true,
        },
      },
      customization: {
        themes: [],
        variants: [],
        globalStyles: true,
        componentOverrides: true,
        cssVariables: true,
      },
      compatibility: {
        react: {
          minVersion: '17.0.0',
          hooks: true,
          concurrent: true,
        },
        typescript: true,
      },
    };
  }

  private getShadcnUIIntegration(): LibraryIntegration {
    return {
      importStrategy: {
        type: 'named',
        modulePath: './components/ui',
        treeshaking: true,
      },
      themeIntegration: {
        supported: true,
        customization: {
          colors: true,
          typography: true,
          spacing: true,
          components: true,
        },
      },
      styleStrategy: {
        approach: 'css',
        runtime: false,
        ssr: true,
        optimization: {
          criticalCSS: true,
          purgeCSS: true,
          autoprefixer: true,
        },
      },
      customization: {
        themes: [],
        variants: [],
        globalStyles: true,
        componentOverrides: true,
        cssVariables: true,
      },
      compatibility: {
        react: {
          minVersion: '18.0.0',
          hooks: true,
          concurrent: true,
        },
        typescript: true,
      },
    };
  }

  private getNextUIIntegration(): LibraryIntegration {
    return {
      importStrategy: {
        type: 'named',
        modulePath: '@nextui-org/react',
        treeshaking: true,
      },
      themeIntegration: {
        supported: true,
        themeProvider: 'NextUIProvider',
        customization: {
          colors: true,
          typography: true,
          spacing: true,
          components: true,
        },
      },
      styleStrategy: {
        approach: 'css-in-js',
        runtime: true,
        ssr: true,
        optimization: {
          criticalCSS: true,
          purgeCSS: false,
          autoprefixer: true,
        },
      },
      customization: {
        themes: [],
        variants: [],
        globalStyles: true,
        componentOverrides: true,
        cssVariables: true,
      },
      compatibility: {
        react: {
          minVersion: '18.0.0',
          hooks: true,
          concurrent: true,
        },
        typescript: true,
      },
    };
  }

  private getElementPlusIntegration(): LibraryIntegration {
    return {
      importStrategy: {
        type: 'named',
        modulePath: 'element-plus',
        treeshaking: true,
      },
      themeIntegration: {
        supported: true,
        customization: {
          colors: true,
          typography: true,
          spacing: true,
          components: true,
        },
      },
      styleStrategy: {
        approach: 'css',
        runtime: false,
        ssr: true,
        optimization: {
          criticalCSS: true,
          purgeCSS: true,
          autoprefixer: true,
        },
      },
      customization: {
        themes: [],
        variants: [],
        globalStyles: true,
        componentOverrides: true,
        cssVariables: true,
      },
      compatibility: {
        vue: {
          minVersion: '3.2.0',
          composition: true,
        },
        typescript: true,
      },
    };
  }

  private getVuetifyIntegration(): LibraryIntegration {
    return {
      importStrategy: {
        type: 'named',
        modulePath: 'vuetify',
        treeshaking: true,
      },
      themeIntegration: {
        supported: true,
        customization: {
          colors: true,
          typography: true,
          spacing: true,
          components: true,
        },
      },
      styleStrategy: {
        approach: 'sass',
        runtime: false,
        ssr: true,
        optimization: {
          criticalCSS: true,
          purgeCSS: true,
          autoprefixer: true,
        },
      },
      customization: {
        themes: [],
        variants: [],
        globalStyles: true,
        componentOverrides: true,
        cssVariables: false,
      },
      compatibility: {
        vue: {
          minVersion: '3.0.0',
          composition: true,
        },
        typescript: true,
      },
    };
  }

  /**
   * Analysis methods
   */
  private determinePrimaryLibrary(
    libraries: ComponentLibrary[],
  ): ComponentLibrary | undefined {
    if (libraries.length === 0) {
      return undefined;
    }

    return libraries.reduce((primary, current) =>
      current.confidence > primary.confidence ? current : primary,
    );
  }

  private detectConflicts(libraries: ComponentLibrary[]): LibraryConflict[] {
    const conflicts: LibraryConflict[] = [];

    // Check for multiple React UI libraries
    const reactLibraries = libraries.filter(
      (lib) => lib.metadata.framework === 'react',
    );
    if (reactLibraries.length > 1) {
      conflicts.push({
        libraries: reactLibraries.map((lib) => lib.name),
        type: 'styling',
        description:
          'Multiple React UI libraries detected which may cause styling conflicts',
        resolution: 'Choose one primary UI library for consistency',
        severity: 'medium',
      });
    }

    // Check for conflicting CSS-in-JS libraries
    const cssInJsLibraries = libraries.filter(
      (lib) => lib.integration.styleStrategy.approach === 'css-in-js',
    );
    if (cssInJsLibraries.length > 1) {
      conflicts.push({
        libraries: cssInJsLibraries.map((lib) => lib.name),
        type: 'styling',
        description: 'Multiple CSS-in-JS solutions detected',
        resolution: 'Standardize on one CSS-in-JS approach',
        severity: 'medium',
      });
    }

    return conflicts;
  }

  private analyzeCompatibility(
    libraries: ComponentLibrary[],
  ): CrossLibraryCompatibility {
    const issues: any[] = [];
    const solutions: any[] = [];

    // Check for React version conflicts
    const reactLibraries = libraries.filter(
      (lib) => lib.integration.compatibility.react,
    );
    if (reactLibraries.length > 1) {
      const minVersions = reactLibraries.map(
        (lib) => lib.integration.compatibility.react?.minVersion || '0.0.0',
      );
      // Simple version conflict detection (would be more sophisticated in real implementation)
    }

    return {
      compatible: issues.length === 0,
      issues,
      solutions,
    };
  }

  private generateRecommendations(
    libraries: ComponentLibrary[],
    conflicts: LibraryConflict[],
  ): LibraryRecommendation[] {
    const recommendations: LibraryRecommendation[] = [];

    // Recommend primary library selection if multiple detected
    if (libraries.length > 1) {
      recommendations.push({
        type: 'optimization',
        description:
          'Choose one primary component library to maintain consistency',
        benefits: [
          'Consistent design',
          'Smaller bundle size',
          'Easier maintenance',
        ],
        effort: 'medium',
        priority: 'high',
      });
    }

    // Recommend design system if no library detected
    if (libraries.length === 0) {
      recommendations.push({
        type: 'integration',
        library: 'material-ui',
        description:
          'Consider adopting a component library for faster development',
        benefits: [
          'Pre-built components',
          'Consistent design',
          'Accessibility features',
        ],
        effort: 'medium',
        priority: 'medium',
      });
    }

    return recommendations;
  }

  /**
   * Utility methods
   */
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

  private getPackageVersion(
    packageJson: any,
    packageName: string,
  ): string | undefined {
    const allDeps = {
      ...packageJson.dependencies,
      ...packageJson.devDependencies,
    };

    return allDeps[packageName];
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

  private async searchInFiles(
    searchTerm: string,
    patterns: string[],
  ): Promise<boolean> {
    try {
      for (const pattern of patterns) {
        const files = await vscode.workspace.findFiles(
          pattern,
          '**/node_modules/**',
        );

        for (const file of files.slice(0, 5)) {
          // Limit search for performance
          try {
            const content = await fs.readFile(file.fsPath, 'utf-8');
            if (content.includes(searchTerm)) {
              return true;
            }
          } catch (error) {
            continue;
          }
        }
      }
      return false;
    } catch (error) {
      return false;
    }
  }

  private async checkShadcnComponents(): Promise<boolean> {
    try {
      const componentsPath = path.join(this.workspaceRoot, 'components', 'ui');
      await fs.access(componentsPath);
      const files = await fs.readdir(componentsPath);
      return files.length > 0;
    } catch (error) {
      return false;
    }
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
