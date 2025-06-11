import { createBridgeContract } from '@stagewise/srpc';
import { z } from 'zod';

// The toolbar needs to implement a discovery-mechanism to check if the extension is running and find the correct port
// The extension also needs to implement a discovery-mechanism to find the correct toolbar.
export const DEFAULT_PORT = 5746; // This is the default port for the extension's RPC and MCP servers; if occupied, the extension will take the next available port (5747, 5748, etc., up to 5756
export const PING_ENDPOINT = '/ping/stagewise'; // Will be used by the toolbar to check if the extension is running and find the correct port
export const PING_RESPONSE = 'stagewise'; // The response to the ping request

export const contract = createBridgeContract({
  server: {
    getSessionInfo: {
      request: z.object({}),
      response: z.object({
        sessionId: z.string().optional(),
        appName: z
          .string()
          .describe('The name of the application, e.g. "VS Code" or "Cursor"'),
        displayName: z
          .string()
          .describe('Human-readable window identifier for UI display'),
        port: z
          .number()
          .describe('Port number this VS Code instance is running on'),
      }),
      update: z.object({}),
    },
    triggerAgentPrompt: {
      request: z.object({
        sessionId: z.string().optional(),
        prompt: z.string(),
        model: z
          .string()
          .optional()
          .describe('The model to use for the agent prompt'),
        files: z
          .array(z.string())
          .optional()
          .describe('Link project files to the agent prompt'),
        mode: z
          .enum(['agent', 'ask', 'manual'])
          .optional()
          .describe('The mode to use for the agent prompt'),
        images: z
          .array(z.string())
          .optional()
          .describe('Upload files like images, videos, etc.'),
      }),
      response: z.object({
        sessionId: z.string().optional(),
        result: z.object({
          success: z.boolean(),
          error: z.string().optional(),
          errorCode: z.enum(['session_mismatch']).optional(),
          output: z.string().optional(),
        }),
      }),
      update: z.object({
        sessionId: z.string().optional(),
        updateText: z.string(),
      }),
    },
    getElementSourceInfo: {
      request: z.object({
        sessionId: z.string().optional(),
        elementSelector: z
          .string()
          .describe('CSS selector or unique identifier for the element'),
        componentName: z
          .string()
          .optional()
          .describe('React/Vue/Angular component name if available'),
        frameworkType: z
          .enum(['react', 'vue', 'angular', 'unknown'])
          .optional(),
      }),
      response: z.object({
        sessionId: z.string().optional(),
        result: z.object({
          success: z.boolean(),
          error: z.string().optional(),
          sourceFile: z
            .string()
            .optional()
            .describe('Path to the source file containing the component'),
          lineNumber: z
            .number()
            .optional()
            .describe('Line number where the component/element is defined'),
          componentInfo: z
            .object({
              name: z.string(),
              type: z.enum(['functional', 'class', 'element']),
              framework: z.enum(['react', 'vue', 'angular', 'html']),
            })
            .optional(),
          styleType: z
            .enum(['inline', 'css-class', 'styled-components', 'tailwind'])
            .optional(),
        }),
      }),
      update: z.object({
        sessionId: z.string().optional(),
        progress: z.number().describe('Progress percentage 0-100'),
        step: z.string().describe('Current detection step'),
      }),
    },
    updateElementStyles: {
      request: z.object({
        sessionId: z.string().optional(),
        elementSelector: z
          .string()
          .describe('CSS selector or unique identifier for the element'),
        styles: z.record(z.string()).describe('CSS styles as key-value pairs'),
        sourceFile: z.string().optional().describe('Source file path if known'),
        componentName: z
          .string()
          .optional()
          .describe('Component name if available'),
        updateType: z
          .enum(['inline', 'css-class', 'styled-components', 'tailwind'])
          .optional(),
        backup: z
          .boolean()
          .optional()
          .default(true)
          .describe('Whether to create backup before updating'),
      }),
      response: z.object({
        sessionId: z.string().optional(),
        result: z.object({
          success: z.boolean(),
          error: z.string().optional(),
          updatedFiles: z
            .array(z.string())
            .optional()
            .describe('List of files that were modified'),
          backupFiles: z
            .array(z.string())
            .optional()
            .describe('List of backup files created'),
          appliedStyles: z
            .record(z.string())
            .optional()
            .describe('Styles that were successfully applied'),
        }),
      }),
      update: z.object({
        sessionId: z.string().optional(),
        progress: z.number().describe('Progress percentage 0-100'),
        step: z.string().describe('Current update step'),
      }),
    },
    validateStyleChanges: {
      request: z.object({
        sessionId: z.string().optional(),
        elementSelector: z
          .string()
          .describe('CSS selector or unique identifier for the element'),
        styles: z.record(z.string()).describe('CSS styles to validate'),
        sourceFile: z.string().optional().describe('Source file path if known'),
      }),
      response: z.object({
        sessionId: z.string().optional(),
        result: z.object({
          success: z.boolean(),
          valid: z.boolean().describe('Whether the style changes are valid'),
          error: z.string().optional(),
          warnings: z
            .array(z.string())
            .optional()
            .describe('Non-blocking warnings about the changes'),
          suggestions: z
            .array(z.string())
            .optional()
            .describe('Suggested improvements or alternatives'),
        }),
      }),
      update: z.object({
        sessionId: z.string().optional(),
        step: z.string().describe('Current validation step'),
      }),
    },
  },
});

export type PromptRequest = z.infer<
  typeof contract.server.triggerAgentPrompt.request
>;

export type VSCodeContext = z.infer<
  typeof contract.server.getSessionInfo.response
>;

// Visual Editor Types
export type ElementSourceInfoRequest = z.infer<
  typeof contract.server.getElementSourceInfo.request
>;

export type ElementSourceInfoResponse = z.infer<
  typeof contract.server.getElementSourceInfo.response
>;

export type UpdateElementStylesRequest = z.infer<
  typeof contract.server.updateElementStyles.request
>;

export type UpdateElementStylesResponse = z.infer<
  typeof contract.server.updateElementStyles.response
>;

export type ValidateStyleChangesRequest = z.infer<
  typeof contract.server.validateStyleChanges.request
>;

export type ValidateStyleChangesResponse = z.infer<
  typeof contract.server.validateStyleChanges.response
>;
