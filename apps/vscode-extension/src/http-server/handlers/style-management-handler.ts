import type { Request, Response } from 'express';
import { StyleManagementService } from '../../style-management';

export class StyleManagementHandler {
  private styleManagementService: StyleManagementService;

  constructor(workspaceRoot: string) {
    this.styleManagementService =
      StyleManagementService.getInstance(workspaceRoot);
  }

  /**
   * Initialize style management service
   */
  public initialize = async (req: Request, res: Response): Promise<void> => {
    try {
      await this.styleManagementService.initialize();

      res.json({
        success: true,
        message: 'Style management service initialized',
        data: {
          frameworks: this.styleManagementService.getDetectedFrameworks(),
          designSystem: this.styleManagementService.getDesignSystem(),
        },
      });
    } catch (error) {
      console.error('Error initializing style management:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to initialize style management service',
        details: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  };

  /**
   * Get detected style frameworks
   */
  public getFrameworks = async (req: Request, res: Response): Promise<void> => {
    try {
      const frameworks = this.styleManagementService.getDetectedFrameworks();

      res.json({
        success: true,
        data: frameworks,
      });
    } catch (error) {
      console.error('Error getting frameworks:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to get style frameworks',
      });
    }
  };

  /**
   * Get design system information
   */
  public getDesignSystem = async (
    req: Request,
    res: Response,
  ): Promise<void> => {
    try {
      const designSystem = this.styleManagementService.getDesignSystem();

      res.json({
        success: true,
        data: designSystem,
      });
    } catch (error) {
      console.error('Error getting design system:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to get design system',
      });
    }
  };

  /**
   * Generate styles with intelligent framework selection
   */
  public generateStyles = async (
    req: Request,
    res: Response,
  ): Promise<void> => {
    try {
      const { properties } = req.body;

      if (!properties || typeof properties !== 'object') {
        res.status(400).json({
          success: false,
          error: 'Invalid properties provided',
        });
        return;
      }

      const result =
        await this.styleManagementService.generateIntelligentStyles(properties);

      res.json({
        success: true,
        data: result,
      });
    } catch (error) {
      console.error('Error generating styles:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to generate styles',
        details: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  };

  /**
   * Validate CSS styles
   */
  public validateStyles = async (
    req: Request,
    res: Response,
  ): Promise<void> => {
    try {
      const { css } = req.body;

      if (!css || typeof css !== 'string') {
        res.status(400).json({
          success: false,
          error: 'Invalid CSS provided',
        });
        return;
      }

      const validation = await this.styleManagementService.validateStyles(css);

      res.json({
        success: true,
        data: validation,
      });
    } catch (error) {
      console.error('Error validating styles:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to validate styles',
      });
    }
  };

  /**
   * Suggest design tokens for CSS properties
   */
  public suggestTokens = async (req: Request, res: Response): Promise<void> => {
    try {
      const { property, value } = req.body;

      if (!property || !value) {
        res.status(400).json({
          success: false,
          error: 'Property and value are required',
        });
        return;
      }

      const suggestions = this.styleManagementService.suggestDesignTokens(
        property,
        value,
      );

      res.json({
        success: true,
        data: suggestions,
      });
    } catch (error) {
      console.error('Error suggesting tokens:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to suggest design tokens',
      });
    }
  };

  /**
   * Convert styles between frameworks
   */
  public convertStyles = async (req: Request, res: Response): Promise<void> => {
    try {
      const { css, fromFramework, toFramework } = req.body;

      if (!css || !fromFramework || !toFramework) {
        res.status(400).json({
          success: false,
          error: 'CSS, fromFramework, and toFramework are required',
        });
        return;
      }

      const result = await this.styleManagementService.convertStyles(
        css,
        fromFramework,
        toFramework,
      );

      res.json({
        success: true,
        data: result,
      });
    } catch (error) {
      console.error('Error converting styles:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to convert styles',
      });
    }
  };

  /**
   * Get framework-specific recommendations
   */
  public getRecommendations = async (
    req: Request,
    res: Response,
  ): Promise<void> => {
    try {
      const recommendations =
        this.styleManagementService.getFrameworkRecommendations();

      res.json({
        success: true,
        data: recommendations,
      });
    } catch (error) {
      console.error('Error getting recommendations:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to get recommendations',
      });
    }
  };

  /**
   * Get optimal generation strategy
   */
  public getStrategy = async (req: Request, res: Response): Promise<void> => {
    try {
      const strategy = this.styleManagementService.getOptimalStrategy();

      res.json({
        success: true,
        data: strategy,
      });
    } catch (error) {
      console.error('Error getting strategy:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to get generation strategy',
      });
    }
  };

  /**
   * Refresh style management service
   */
  public refresh = async (req: Request, res: Response): Promise<void> => {
    try {
      await this.styleManagementService.refresh();

      res.json({
        success: true,
        message: 'Style management service refreshed',
        data: {
          frameworks: this.styleManagementService.getDetectedFrameworks(),
          designSystem: this.styleManagementService.getDesignSystem(),
        },
      });
    } catch (error) {
      console.error('Error refreshing style management:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to refresh style management service',
      });
    }
  };

  /**
   * Clear cache
   */
  public clearCache = async (req: Request, res: Response): Promise<void> => {
    try {
      this.styleManagementService.clearCache();

      res.json({
        success: true,
        message: 'Style management cache cleared',
      });
    } catch (error) {
      console.error('Error clearing cache:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to clear cache',
      });
    }
  };
}
