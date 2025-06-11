import type { RequestHandler } from 'express';
import { SourceDetectionService } from '../../source-detection';
import type {
  ElementSourceInfoRequest,
  ElementSourceInfoResponse,
} from '@stagewise/extension-toolbar-srpc-contract';

export class SourceDetectionHandler {
  private sourceDetectionService: SourceDetectionService;

  constructor() {
    this.sourceDetectionService = SourceDetectionService.getInstance();
  }

  public getElementSourceInfo: RequestHandler = async (req, res) => {
    try {
      const body = req.body as ElementSourceInfoRequest;

      const elementInfo = {
        tagName: this.extractTagNameFromSelector(body.elementSelector),
        id: this.extractIdFromSelector(body.elementSelector),
        className: this.extractClassFromSelector(body.elementSelector),
      };

      const sourceInfo =
        await this.sourceDetectionService.findElementSource(elementInfo);

      if (sourceInfo) {
        const response: ElementSourceInfoResponse = {
          sessionId: body.sessionId,
          result: {
            success: true,
            sourceFile: sourceInfo.filePath,
            lineNumber: sourceInfo.lineNumber,
            componentInfo: {
              name: sourceInfo.componentName,
              type:
                sourceInfo.elementType === 'component'
                  ? 'functional'
                  : 'element',
              framework: sourceInfo.framework,
            },
            styleType: 'css-class',
          },
        };

        res.status(200).json(response);
      } else {
        const response: ElementSourceInfoResponse = {
          sessionId: body.sessionId,
          result: {
            success: false,
            error:
              'Could not find source information for the specified element',
          },
        };

        res.status(200).json(response);
      }
    } catch (error) {
      console.error('[SourceDetectionHandler] Error:', error);

      const response: ElementSourceInfoResponse = {
        sessionId: req.body?.sessionId,
        result: {
          success: false,
          error:
            error instanceof Error ? error.message : 'Unknown error occurred',
        },
      };

      res.status(500).json(response);
    }
  };

  private extractTagNameFromSelector(selector: string): string {
    const tagMatch = selector.match(/^([a-z-]+)/i);
    return tagMatch ? tagMatch[1] : 'div';
  }

  private extractIdFromSelector(selector: string): string | undefined {
    const idMatch = selector.match(/#([a-zA-Z0-9_-]+)/);
    return idMatch ? idMatch[1] : undefined;
  }

  private extractClassFromSelector(selector: string): string | undefined {
    const classMatches = selector.match(/\.([a-zA-Z0-9_-]+)/g);
    if (classMatches) {
      return classMatches.map((match) => match.substring(1)).join(' ');
    }
    return undefined;
  }

  public getFrameworkInfo: RequestHandler = async (req, res) => {
    try {
      const framework = this.sourceDetectionService.getDetectedFramework();

      res.status(200).json({
        framework: framework?.framework || 'unknown',
        confidence: framework?.confidence || 0,
        evidence: framework?.evidence || [],
        version: framework?.version,
        buildTool: framework?.buildTool,
      });
    } catch (error) {
      console.error('[SourceDetectionHandler] Framework info error:', error);
      res.status(500).json({
        error:
          error instanceof Error ? error.message : 'Unknown error occurred',
      });
    }
  };

  public searchComponents: RequestHandler = async (req, res) => {
    try {
      const { query, options } = req.body;

      if (!query || typeof query !== 'string') {
        res.status(400).json({
          error: 'Query parameter is required and must be a string',
        });
        return;
      }

      const results = await this.sourceDetectionService.searchComponents(
        query,
        options,
      );

      res.status(200).json({
        results,
        total: results.length,
      });
    } catch (error) {
      console.error('[SourceDetectionHandler] Search error:', error);
      res.status(500).json({
        error:
          error instanceof Error ? error.message : 'Unknown error occurred',
      });
    }
  };
}
