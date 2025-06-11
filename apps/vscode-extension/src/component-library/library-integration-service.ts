import * as vscode from 'vscode';
import { ComponentLibraryDetector } from './library-detector';
import { ComponentMapper } from './component-mapper';
import { DesignSystemManager } from './design-system-manager';
import type {
  ComponentLibrary,
  ComponentLibraryName,
  ComponentLibraryDetectionResult,
  ComponentMappingRule,
  LibraryIntegrationConfig,
  ComponentLibraryAnalysis,
  ComponentDefinition,
  DesignSystemInfo,
  LibraryRecommendation,
} from './types';

export class LibraryIntegrationService {
  private detector: ComponentLibraryDetector;
  private mapper: ComponentMapper;
  private designSystemManager: DesignSystemManager;
  private config: Map<ComponentLibraryName, LibraryIntegrationConfig> =
    new Map();
  private analysisCache: Map<string, ComponentLibraryAnalysis> = new Map();

  constructor(workspaceRoot: string) {
    this.detector = new ComponentLibraryDetector(workspaceRoot);
    this.mapper = new ComponentMapper();
    this.designSystemManager = new DesignSystemManager();
    this.loadConfiguration();
  }

  /**
   * Initialize the service and detect libraries
   */
  public async initialize(): Promise<ComponentLibraryDetectionResult> {
    console.log('Initializing Component Library Integration Service...');

    try {
      const detectionResult = await this.detector.detectLibraries();

      // Configure detected libraries
      for (const library of detectionResult.libraries) {
        await this.configureLibrary(library);
      }

      // Initialize design systems
      for (const library of detectionResult.libraries) {
        if (library.designSystem) {
          await this.designSystemManager.loadDesignSystem(library.designSystem);
        }
      }

      console.log(
        `Detected ${detectionResult.libraries.length} component libraries`,
      );
      return detectionResult;
    } catch (error) {
      console.error('Error initializing library integration service:', error);
      throw error;
    }
  }

  /**
   * Get all detected libraries
   */
  public async getDetectedLibraries(): Promise<ComponentLibraryDetectionResult> {
    return this.detector.detectLibraries();
  }

  /**
   * Get library configuration
   */
  public getLibraryConfig(
    library: ComponentLibraryName,
  ): LibraryIntegrationConfig | undefined {
    return this.config.get(library);
  }

  /**
   * Update library configuration
   */
  public async updateLibraryConfig(
    library: ComponentLibraryName,
    config: Partial<LibraryIntegrationConfig>,
  ): Promise<void> {
    const existingConfig = this.config.get(library);
    const newConfig: LibraryIntegrationConfig = {
      library,
      enabled: true,
      customization: {},
      components: {
        enabled: [],
        disabled: [],
        customized: {},
      },
      optimization: {
        treeshaking: true,
        bundleSplitting: false,
        cssOptimization: true,
      },
      ...existingConfig,
      ...config,
    };

    this.config.set(library, newConfig);
    await this.saveConfiguration();
  }

  /**
   * Get component mapping between libraries
   */
  public getComponentMapping(
    sourceLibrary: ComponentLibraryName,
    targetLibrary: ComponentLibraryName,
    componentName: string,
  ): ComponentMappingRule | null {
    return this.mapper.mapComponent(
      sourceLibrary,
      targetLibrary,
      componentName,
    );
  }

  /**
   * Get component suggestions
   */
  public getComponentSuggestions(
    currentLibrary: ComponentLibraryName,
    componentName: string,
    targetLibraries?: ComponentLibraryName[],
  ): Array<{
    library: ComponentLibraryName;
    component: string;
    confidence: number;
    mapping: ComponentMappingRule | null;
  }> {
    const libraries = targetLibraries || this.mapper.getSupportedLibraries();
    return this.mapper.getComponentSuggestions(
      currentLibrary,
      componentName,
      libraries,
    );
  }

  /**
   * Generate migration code
   */
  public generateMigrationCode(
    sourceLibrary: ComponentLibraryName,
    targetLibrary: ComponentLibraryName,
    sourceCode: string,
  ): {
    transformedCode: string;
    imports: string[];
    notes: string[];
    unmappedComponents: string[];
  } {
    const componentRegex = /<(\w+)/g;
    const components = new Set<string>();
    let match: RegExpExecArray | null;

    // Extract component names from source code
    match = componentRegex.exec(sourceCode);
    while (match !== null) {
      const componentName = match[1];
      if (
        componentName &&
        componentName[0] === componentName[0].toUpperCase()
      ) {
        components.add(componentName);
      }
      match = componentRegex.exec(sourceCode);
    }

    let transformedCode = sourceCode;
    const allImports: string[] = [];
    const allNotes: string[] = [];
    const unmappedComponents: string[] = [];

    // Process each component
    for (const componentName of components) {
      const mapping = this.mapper.mapComponent(
        sourceLibrary,
        targetLibrary,
        componentName,
      );

      if (mapping) {
        const result = this.mapper.generateMigrationCode(
          mapping,
          transformedCode,
        );
        transformedCode = result.transformedCode;
        allImports.push(...result.imports);
        allNotes.push(...result.notes);
      } else {
        unmappedComponents.push(componentName);
      }
    }

    // Remove duplicate imports
    const uniqueImports = Array.from(new Set(allImports));

    return {
      transformedCode,
      imports: uniqueImports,
      notes: allNotes,
      unmappedComponents,
    };
  }

  /**
   * Analyze migration complexity
   */
  public analyzeMigrationComplexity(
    sourceLibrary: ComponentLibraryName,
    targetLibrary: ComponentLibraryName,
    components: string[],
  ): {
    complexity: 'low' | 'medium' | 'high';
    mappableComponents: number;
    unmappableComponents: string[];
    requiredManualWork: string[];
    estimatedEffort: string;
    recommendations: LibraryRecommendation[];
  } {
    const analysis = this.mapper.analyzeMigrationComplexity(
      sourceLibrary,
      targetLibrary,
      components,
    );

    // Generate recommendations based on analysis
    const recommendations: LibraryRecommendation[] = [];

    if (analysis.unmappableComponents.length > 0) {
      recommendations.push({
        type: 'migration',
        description: `${analysis.unmappableComponents.length} components need manual migration`,
        benefits: ['Complete migration', 'Consistent design system'],
        effort: 'high',
        priority: 'medium',
        implementation: {
          steps: [
            'Create custom components for unmapped components',
            'Implement similar functionality using target library patterns',
            'Test thoroughly for feature parity',
          ],
          codeChanges: analysis.unmappableComponents.map(
            (c) => `Implement ${c} component`,
          ),
        },
      });
    }

    return {
      ...analysis,
      recommendations,
    };
  }

  /**
   * Get library analysis
   */
  public async getLibraryAnalysis(
    library: ComponentLibraryName,
  ): Promise<ComponentLibraryAnalysis | null> {
    const cacheKey = `analysis-${library}`;
    const cached = this.analysisCache.get(cacheKey);

    if (cached) {
      return cached;
    }

    try {
      const analysis: ComponentLibraryAnalysis = {
        usage: {
          totalComponents: 0,
          usedComponents: [],
          unusedComponents: [],
          mostUsed: [],
          customizations: [],
        },
        performance: {
          bundleSize: {
            total: 0,
            used: 0,
            unused: 0,
          },
          loadTime: {
            initial: 0,
            lazy: 0,
          },
          runtime: {
            renderTime: 0,
            memoryUsage: 0,
          },
        },
        maintenance: {
          lastUpdate: Date.now(),
          version: '0.0.0',
          dependencies: {
            outdated: [],
            vulnerable: [],
            breaking: [],
          },
          migration: {
            available: false,
            effort: 'low',
          },
        },
        security: {
          vulnerabilities: [],
          recommendations: [],
          score: 100,
        },
      };

      this.analysisCache.set(cacheKey, analysis);
      return analysis;
    } catch (error) {
      console.error('Error analyzing library:', error);
      return null;
    }
  }

  /**
   * Get design system information
   */
  public async getDesignSystem(
    library: ComponentLibraryName,
  ): Promise<DesignSystemInfo | null> {
    const detectionResult = await this.detector.detectLibraries();
    const libraryInfo = detectionResult.libraries.find(
      (lib) => lib.name === library,
    );

    if (libraryInfo?.designSystem) {
      return this.designSystemManager.getDesignSystem(
        libraryInfo.designSystem.name,
      );
    }

    return null;
  }

  /**
   * Get component definitions for a library
   */
  public async getComponentDefinitions(
    library: ComponentLibraryName,
  ): Promise<ComponentDefinition[]> {
    const detectionResult = await this.detector.detectLibraries();
    const libraryInfo = detectionResult.libraries.find(
      (lib) => lib.name === library,
    );

    return libraryInfo?.components || [];
  }

  /**
   * Search components across libraries
   */
  public async searchComponents(
    query: string,
    libraries?: ComponentLibraryName[],
  ): Promise<
    Array<{
      library: ComponentLibraryName;
      component: ComponentDefinition;
      relevance: number;
    }>
  > {
    const detectionResult = await this.detector.detectLibraries();
    const targetLibraries =
      libraries || detectionResult.libraries.map((lib) => lib.name);
    const results: Array<{
      library: ComponentLibraryName;
      component: ComponentDefinition;
      relevance: number;
    }> = [];

    for (const libraryName of targetLibraries) {
      const library = detectionResult.libraries.find(
        (lib) => lib.name === libraryName,
      );

      if (library) {
        for (const component of library.components) {
          const relevance = this.calculateRelevance(query, component);

          if (relevance > 0.3) {
            results.push({
              library: libraryName,
              component,
              relevance,
            });
          }
        }
      }
    }

    return results.sort((a, b) => b.relevance - a.relevance);
  }

  /**
   * Get integration recommendations
   */
  public async getIntegrationRecommendations(): Promise<
    LibraryRecommendation[]
  > {
    const detectionResult = await this.detector.detectLibraries();
    const recommendations: LibraryRecommendation[] = [];

    // Add detection-based recommendations
    recommendations.push(...detectionResult.recommendations);

    return recommendations;
  }

  /**
   * Refresh library detection
   */
  public async refreshDetection(): Promise<ComponentLibraryDetectionResult> {
    this.detector.clearCache();
    this.analysisCache.clear();
    return this.detector.detectLibraries();
  }

  /**
   * Private helper methods
   */
  private async configureLibrary(library: ComponentLibrary): Promise<void> {
    const existingConfig = this.config.get(library.name);

    if (!existingConfig) {
      const defaultConfig: LibraryIntegrationConfig = {
        library: library.name,
        enabled: true,
        version: library.version,
        customization: {},
        components: {
          enabled: [],
          disabled: [],
          customized: {},
        },
        optimization: {
          treeshaking: library.integration.importStrategy.treeshaking,
          bundleSplitting: false,
          cssOptimization: true,
        },
      };

      this.config.set(library.name, defaultConfig);
    }
  }

  private calculateRelevance(
    query: string,
    component: ComponentDefinition,
  ): number {
    const queryLower = query.toLowerCase();
    let relevance = 0;

    // Check name match
    if (component.name.toLowerCase().includes(queryLower)) {
      relevance += 0.8;
    }

    // Check display name match
    if (component.displayName.toLowerCase().includes(queryLower)) {
      relevance += 0.6;
    }

    // Check category match
    if (component.category.toLowerCase().includes(queryLower)) {
      relevance += 0.4;
    }

    return Math.min(1, relevance);
  }

  private async loadConfiguration(): Promise<void> {
    try {
      const workspaceConfig = vscode.workspace.getConfiguration(
        'stagewise.componentLibrary',
      );
      const configData = workspaceConfig.get<
        Record<string, LibraryIntegrationConfig>
      >('libraries', {});

      for (const [libraryName, config] of Object.entries(configData)) {
        this.config.set(libraryName as ComponentLibraryName, config);
      }
    } catch (error) {
      console.warn('Could not load component library configuration:', error);
    }
  }

  private async saveConfiguration(): Promise<void> {
    try {
      const configObject: Record<string, LibraryIntegrationConfig> = {};

      for (const [libraryName, config] of this.config.entries()) {
        configObject[libraryName] = config;
      }

      const workspaceConfig = vscode.workspace.getConfiguration(
        'stagewise.componentLibrary',
      );
      await workspaceConfig.update(
        'libraries',
        configObject,
        vscode.ConfigurationTarget.Workspace,
      );
    } catch (error) {
      console.warn('Could not save component library configuration:', error);
    }
  }

  /**
   * Dispose of resources
   */
  public dispose(): void {
    this.analysisCache.clear();
    this.config.clear();
  }
}
