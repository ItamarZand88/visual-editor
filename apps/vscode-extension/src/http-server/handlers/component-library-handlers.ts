import type { Request, Response } from 'express';
import type { LibraryIntegrationService } from '../../component-library/library-integration-service';
import type { ComponentLibraryName } from '../../component-library/types';

export class ComponentLibraryHandlers {
  constructor(private libraryService: LibraryIntegrationService) {}

  /**
   * Initialize component library detection
   * POST /api/component-library/initialize
   */
  public initialize = async (req: Request, res: Response): Promise<void> => {
    try {
      console.log('API: Initializing component library detection');

      const result = await this.libraryService.initialize();

      res.json({
        success: true,
        data: {
          detectedLibraries: result.libraries.length,
          primary: result.primary?.name,
          libraries: result.libraries.map((lib) => ({
            name: lib.name,
            displayName: lib.metadata.displayName,
            version: lib.version,
            confidence: lib.confidence,
            framework: lib.metadata.framework,
          })),
          conflicts: result.conflicts,
          recommendations: result.recommendations,
        },
      });
    } catch (error) {
      console.error('Error initializing component library detection:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to initialize component library detection',
        details: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  };

  /**
   * Get detected libraries
   * GET /api/component-library/libraries
   */
  public getLibraries = async (req: Request, res: Response): Promise<void> => {
    try {
      console.log('API: Getting detected libraries');

      const result = await this.libraryService.getDetectedLibraries();

      res.json({
        success: true,
        data: {
          libraries: result.libraries,
          primary: result.primary,
          conflicts: result.conflicts,
          compatibility: result.compatibility,
        },
      });
    } catch (error) {
      console.error('Error getting libraries:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to get libraries',
        details: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  };

  /**
   * Get library configuration
   * GET /api/component-library/config/:library
   */
  public getLibraryConfig = async (
    req: Request,
    res: Response,
  ): Promise<void> => {
    try {
      const library = req.params.library as ComponentLibraryName;
      console.log(`API: Getting configuration for library: ${library}`);

      const config = this.libraryService.getLibraryConfig(library);

      if (!config) {
        res.status(404).json({
          success: false,
          error: `Configuration not found for library: ${library}`,
        });
        return;
      }

      res.json({
        success: true,
        data: config,
      });
    } catch (error) {
      console.error('Error getting library config:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to get library configuration',
        details: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  };

  /**
   * Update library configuration
   * PATCH /api/component-library/config/:library
   */
  public updateLibraryConfig = async (
    req: Request,
    res: Response,
  ): Promise<void> => {
    try {
      const library = req.params.library as ComponentLibraryName;
      const configUpdates = req.body;

      console.log(`API: Updating configuration for library: ${library}`);

      await this.libraryService.updateLibraryConfig(library, configUpdates);

      const updatedConfig = this.libraryService.getLibraryConfig(library);

      res.json({
        success: true,
        data: updatedConfig,
      });
    } catch (error) {
      console.error('Error updating library config:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to update library configuration',
        details: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  };

  /**
   * Get component mapping
   * GET /api/component-library/mapping
   */
  public getComponentMapping = async (
    req: Request,
    res: Response,
  ): Promise<void> => {
    try {
      const { sourceLibrary, targetLibrary, component } = req.query as {
        sourceLibrary: ComponentLibraryName;
        targetLibrary: ComponentLibraryName;
        component: string;
      };

      console.log(
        `API: Getting mapping from ${sourceLibrary} to ${targetLibrary} for ${component}`,
      );

      if (!sourceLibrary || !targetLibrary || !component) {
        res.status(400).json({
          success: false,
          error:
            'Missing required parameters: sourceLibrary, targetLibrary, component',
        });
        return;
      }

      const mapping = this.libraryService.getComponentMapping(
        sourceLibrary,
        targetLibrary,
        component,
      );

      res.json({
        success: true,
        data: {
          mapping,
          available: !!mapping,
        },
      });
    } catch (error) {
      console.error('Error getting component mapping:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to get component mapping',
        details: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  };

  /**
   * Get component suggestions
   * GET /api/component-library/suggestions
   */
  public getComponentSuggestions = async (
    req: Request,
    res: Response,
  ): Promise<void> => {
    try {
      const { currentLibrary, component, targetLibraries } = req.query as {
        currentLibrary: ComponentLibraryName;
        component: string;
        targetLibraries?: string;
      };

      console.log(
        `API: Getting suggestions for ${component} from ${currentLibrary}`,
      );

      if (!currentLibrary || !component) {
        res.status(400).json({
          success: false,
          error: 'Missing required parameters: currentLibrary, component',
        });
        return;
      }

      const libraries = targetLibraries
        ? (targetLibraries.split(',') as ComponentLibraryName[])
        : undefined;

      const suggestions = this.libraryService.getComponentSuggestions(
        currentLibrary,
        component,
        libraries,
      );

      res.json({
        success: true,
        data: {
          suggestions,
          count: suggestions.length,
        },
      });
    } catch (error) {
      console.error('Error getting component suggestions:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to get component suggestions',
        details: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  };

  /**
   * Generate migration code
   * POST /api/component-library/migrate
   */
  public generateMigrationCode = async (
    req: Request,
    res: Response,
  ): Promise<void> => {
    try {
      const { sourceLibrary, targetLibrary, sourceCode } = req.body as {
        sourceLibrary: ComponentLibraryName;
        targetLibrary: ComponentLibraryName;
        sourceCode: string;
      };

      console.log(
        `API: Generating migration code from ${sourceLibrary} to ${targetLibrary}`,
      );

      if (!sourceLibrary || !targetLibrary || !sourceCode) {
        res.status(400).json({
          success: false,
          error:
            'Missing required parameters: sourceLibrary, targetLibrary, sourceCode',
        });
        return;
      }

      const result = this.libraryService.generateMigrationCode(
        sourceLibrary,
        targetLibrary,
        sourceCode,
      );

      res.json({
        success: true,
        data: result,
      });
    } catch (error) {
      console.error('Error generating migration code:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to generate migration code',
        details: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  };

  /**
   * Analyze migration complexity
   * POST /api/component-library/analyze-migration
   */
  public analyzeMigrationComplexity = async (
    req: Request,
    res: Response,
  ): Promise<void> => {
    try {
      const { sourceLibrary, targetLibrary, components } = req.body as {
        sourceLibrary: ComponentLibraryName;
        targetLibrary: ComponentLibraryName;
        components: string[];
      };

      console.log(
        `API: Analyzing migration complexity from ${sourceLibrary} to ${targetLibrary}`,
      );

      if (!sourceLibrary || !targetLibrary || !components) {
        res.status(400).json({
          success: false,
          error:
            'Missing required parameters: sourceLibrary, targetLibrary, components',
        });
        return;
      }

      const analysis = this.libraryService.analyzeMigrationComplexity(
        sourceLibrary,
        targetLibrary,
        components,
      );

      res.json({
        success: true,
        data: analysis,
      });
    } catch (error) {
      console.error('Error analyzing migration complexity:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to analyze migration complexity',
        details: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  };

  /**
   * Get library analysis
   * GET /api/component-library/analysis/:library
   */
  public getLibraryAnalysis = async (
    req: Request,
    res: Response,
  ): Promise<void> => {
    try {
      const library = req.params.library as ComponentLibraryName;
      console.log(`API: Getting analysis for library: ${library}`);

      const analysis = await this.libraryService.getLibraryAnalysis(library);

      if (!analysis) {
        res.status(404).json({
          success: false,
          error: `Analysis not available for library: ${library}`,
        });
        return;
      }

      res.json({
        success: true,
        data: analysis,
      });
    } catch (error) {
      console.error('Error getting library analysis:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to get library analysis',
        details: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  };

  /**
   * Get design system information
   * GET /api/component-library/design-system/:library
   */
  public getDesignSystem = async (
    req: Request,
    res: Response,
  ): Promise<void> => {
    try {
      const library = req.params.library as ComponentLibraryName;
      console.log(`API: Getting design system for library: ${library}`);

      const designSystem = await this.libraryService.getDesignSystem(library);

      if (!designSystem) {
        res.status(404).json({
          success: false,
          error: `Design system not found for library: ${library}`,
        });
        return;
      }

      res.json({
        success: true,
        data: designSystem,
      });
    } catch (error) {
      console.error('Error getting design system:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to get design system',
        details: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  };

  /**
   * Get component definitions
   * GET /api/component-library/components/:library
   */
  public getComponentDefinitions = async (
    req: Request,
    res: Response,
  ): Promise<void> => {
    try {
      const library = req.params.library as ComponentLibraryName;
      console.log(`API: Getting component definitions for library: ${library}`);

      const components =
        await this.libraryService.getComponentDefinitions(library);

      res.json({
        success: true,
        data: {
          library,
          components,
          count: components.length,
        },
      });
    } catch (error) {
      console.error('Error getting component definitions:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to get component definitions',
        details: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  };

  /**
   * Search components
   * GET /api/component-library/search
   */
  public searchComponents = async (
    req: Request,
    res: Response,
  ): Promise<void> => {
    try {
      const { query, libraries } = req.query as {
        query: string;
        libraries?: string;
      };

      console.log(`API: Searching components with query: ${query}`);

      if (!query) {
        res.status(400).json({
          success: false,
          error: 'Missing required parameter: query',
        });
        return;
      }

      const targetLibraries = libraries
        ? (libraries.split(',') as ComponentLibraryName[])
        : undefined;

      const results = await this.libraryService.searchComponents(
        query,
        targetLibraries,
      );

      res.json({
        success: true,
        data: {
          query,
          results,
          count: results.length,
        },
      });
    } catch (error) {
      console.error('Error searching components:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to search components',
        details: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  };

  /**
   * Get integration recommendations
   * GET /api/component-library/recommendations
   */
  public getRecommendations = async (
    req: Request,
    res: Response,
  ): Promise<void> => {
    try {
      console.log('API: Getting integration recommendations');

      const recommendations =
        await this.libraryService.getIntegrationRecommendations();

      res.json({
        success: true,
        data: {
          recommendations,
          count: recommendations.length,
        },
      });
    } catch (error) {
      console.error('Error getting recommendations:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to get recommendations',
        details: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  };

  /**
   * Refresh library detection
   * POST /api/component-library/refresh
   */
  public refreshDetection = async (
    req: Request,
    res: Response,
  ): Promise<void> => {
    try {
      console.log('API: Refreshing library detection');

      const result = await this.libraryService.refreshDetection();

      res.json({
        success: true,
        data: {
          detectedLibraries: result.libraries.length,
          libraries: result.libraries.map((lib) => ({
            name: lib.name,
            displayName: lib.metadata.displayName,
            version: lib.version,
            confidence: lib.confidence,
          })),
          conflicts: result.conflicts,
          recommendations: result.recommendations,
        },
      });
    } catch (error) {
      console.error('Error refreshing detection:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to refresh detection',
        details: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  };
}
