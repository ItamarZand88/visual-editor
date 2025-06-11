import * as vscode from 'vscode';
import { startServer, stopServer } from '../http-server/server';
import { findAvailablePort } from '../utils/find-available-port';
import {
  getExtensionBridge,
  DEFAULT_PORT,
} from '@stagewise/extension-toolbar-srpc-contract';
import { setupToolbar } from './setup-toolbar';
import { getCurrentIDE } from 'src/utils/get-current-ide';
import { dispatchAgentCall } from 'src/utils/dispatch-agent-call';
import { getCurrentWindowInfo } from '../utils/window-discovery';
import {
  trackEvent,
  shutdownAnalytics,
  trackTelemetryStateChange,
} from '../utils/analytics';
import {
  createGettingStartedPanel,
  shouldShowGettingStarted,
} from '../webviews/getting-started';
import { ExtensionStorage } from '../data-storage';
import { VScodeContext } from '../utils/vscode-context';
import { SourceDetectionService } from '../source-detection';
import { CodeModificationService } from '../code-modification';
import { StyleManagementService } from '../style-management';
import { LibraryIntegrationService } from '../component-library/library-integration-service';
import {
  PerformanceOptimizationService,
  DEFAULT_PERFORMANCE_CONFIG,
} from '../performance';

// Utility functions for parsing CSS selectors
function extractTagNameFromSelector(selector: string): string {
  const tagMatch = selector.match(/^([a-z-]+)/i);
  return tagMatch ? tagMatch[1] : 'div';
}

function extractIdFromSelector(selector: string): string | undefined {
  const idMatch = selector.match(/#([a-zA-Z0-9_-]+)/);
  return idMatch ? idMatch[1] : undefined;
}

function extractClassFromSelector(selector: string): string | undefined {
  const classMatches = selector.match(/\.([a-zA-Z0-9_-]+)/g);
  if (classMatches) {
    return classMatches.map((match) => match.substring(1)).join(' ');
  }
  return undefined;
}

// Diagnostic collection specifically for our fake prompt
const fakeDiagCollection =
  vscode.languages.createDiagnosticCollection('stagewise');

// Create output channel for stagewise
const outputChannel = vscode.window.createOutputChannel('stagewise');

// Dummy handler for the setupToolbar command
async function setupToolbarHandler() {
  await setupToolbar();
}

export async function activate(context: vscode.ExtensionContext) {
  // Initialize VScodeContext first
  await VScodeContext.initialize(context);

  const ide = getCurrentIDE();
  if (ide === 'UNKNOWN') {
    vscode.window.showInformationMessage(
      'stagewise does not work for your current IDE.',
    );
    return;
  }
  context.subscriptions.push(fakeDiagCollection); // Dispose on deactivation
  context.subscriptions.push(outputChannel); // Dispose output channel on deactivation

  const storage = new ExtensionStorage(context);

  // Initialize Style Management Service
  const workspaceRoot = vscode.workspace.workspaceFolders?.[0]?.uri.fsPath;
  if (workspaceRoot) {
    const styleManagementService =
      StyleManagementService.getInstance(workspaceRoot);
    await styleManagementService.initialize();

    // Initialize Library Integration Service
    const libraryIntegrationService = new LibraryIntegrationService(
      workspaceRoot,
    );
    await libraryIntegrationService.initialize();

    // Initialize Performance Optimization Service
    const performanceService = new PerformanceOptimizationService(
      workspaceRoot,
    );
    await performanceService.initialize(DEFAULT_PERFORMANCE_CONFIG);

    // Start performance monitoring if enabled
    const config = vscode.workspace.getConfiguration('stagewise');
    const performanceMonitoringEnabled = config.get<boolean>(
      'performance.monitoring.enabled',
      true,
    );
    if (performanceMonitoringEnabled) {
      performanceService.startMonitoring();
      outputChannel.appendLine('Performance monitoring started');
    }

    // Store service in context for disposal
    context.subscriptions.push({
      dispose: () => performanceService.dispose(),
    });
  }

  // Add configuration change listener to track telemetry setting changes
  const configChangeListener = vscode.workspace.onDidChangeConfiguration(
    async (e) => {
      if (e.affectsConfiguration('stagewise.telemetry.enabled')) {
        const config = vscode.workspace.getConfiguration('stagewise');
        const telemetryEnabled = config.get<boolean>('telemetry.enabled', true);

        // Track the telemetry state change using the dedicated function
        await trackTelemetryStateChange(telemetryEnabled);
      }
    },
  );

  context.subscriptions.push(configChangeListener);

  try {
    // Track extension activation
    await trackEvent('extension_activated', { ide });

    // Find an available port
    const port = await findAvailablePort(DEFAULT_PORT);

    // Start the HTTP server with the same port
    const server = await startServer(port);
    const bridge = getExtensionBridge(server);

    bridge.register({
      getSessionInfo: async (request, sendUpdate) => {
        return getCurrentWindowInfo(port);
      },
      triggerAgentPrompt: async (request, sendUpdate) => {
        // If sessionId is provided, validate it matches this window
        // If no sessionId provided, accept the request (backward compatibility)
        if (request.sessionId && request.sessionId !== vscode.env.sessionId) {
          const error = `Session mismatch: Request for ${request.sessionId} but this window is ${vscode.env.sessionId}`;
          console.warn(`[Stagewise] ${error}`);
          return {
            sessionId: vscode.env.sessionId,
            result: {
              success: false,
              error: error,
              errorCode: 'session_mismatch',
            },
          };
        }
        await trackEvent('agent_prompt_triggered');

        await dispatchAgentCall(request);
        sendUpdate.sendUpdate({
          sessionId: vscode.env.sessionId,
          updateText: 'Called the agent',
        });

        return {
          sessionId: vscode.env.sessionId,
          result: { success: true },
        };
      },
      getElementSourceInfo: async (request, sendUpdate) => {
        const sourceDetectionService = SourceDetectionService.getInstance();

        try {
          // Extract element information from the request
          const elementInfo = {
            tagName: extractTagNameFromSelector(request.elementSelector),
            id: extractIdFromSelector(request.elementSelector),
            className: extractClassFromSelector(request.elementSelector),
          };

          sendUpdate.sendUpdate({
            sessionId: request.sessionId,
            progress: 30,
            step: 'Searching for element source...',
          });

          const sourceInfo =
            await sourceDetectionService.findElementSource(elementInfo);

          if (sourceInfo) {
            sendUpdate.sendUpdate({
              sessionId: request.sessionId,
              progress: 100,
              step: 'Source found!',
            });

            return {
              sessionId: request.sessionId,
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
          } else {
            return {
              sessionId: request.sessionId,
              result: {
                success: false,
                error:
                  'Could not find source information for the specified element',
              },
            };
          }
        } catch (error) {
          return {
            sessionId: request.sessionId,
            result: {
              success: false,
              error:
                error instanceof Error
                  ? error.message
                  : 'Unknown error occurred',
            },
          };
        }
      },
      updateElementStyles: async (request, sendUpdate) => {
        const codeModificationService = CodeModificationService.getInstance();

        try {
          sendUpdate.sendUpdate({
            sessionId: request.sessionId,
            progress: 10,
            step: 'Preparing style updates...',
          });

          // Create style changes object from the request
          const elementChanges = {
            elementSelector: request.elementSelector,
            elementId: extractIdFromSelector(request.elementSelector),
            className: extractClassFromSelector(request.elementSelector),
            tagName: extractTagNameFromSelector(request.elementSelector),
            styles: request.styles,
            sourceInfo: request.sourceFile
              ? {
                  filePath: request.sourceFile,
                  lineNumber: 1, // Will be resolved by the source detection service
                  columnNumber: 0,
                  componentName: request.componentName || 'Unknown',
                }
              : undefined,
          };

          sendUpdate.sendUpdate({
            sessionId: request.sessionId,
            progress: 30,
            step: 'Applying style changes to source code...',
          });

          const result =
            await codeModificationService.applyStyleChanges(elementChanges);

          if (result.success) {
            sendUpdate.sendUpdate({
              sessionId: request.sessionId,
              progress: 100,
              step: 'Styles applied successfully!',
            });

            return {
              sessionId: request.sessionId,
              result: {
                success: true,
                updatedFiles: result.modifiedFiles,
                backupFiles: result.backupFiles,
                appliedStyles: result.appliedStyles,
              },
            };
          } else {
            return {
              sessionId: request.sessionId,
              result: {
                success: false,
                error: result.error || 'Failed to apply style changes',
              },
            };
          }
        } catch (error) {
          return {
            sessionId: request.sessionId,
            result: {
              success: false,
              error:
                error instanceof Error
                  ? error.message
                  : 'Unknown error occurred',
            },
          };
        }
      },
      validateStyleChanges: async (request, sendUpdate) => {
        const codeModificationService = CodeModificationService.getInstance();

        try {
          sendUpdate.sendUpdate({
            sessionId: request.sessionId,
            step: 'Validating style properties...',
          });

          // Basic CSS property validation
          const warnings: string[] = [];
          const suggestions: string[] = [];
          let isValid = true;

          for (const [property, value] of Object.entries(request.styles)) {
            // Check for valid CSS property names
            if (!/^[a-z-]+$/.test(property)) {
              warnings.push(
                `Property '${property}' may not be a valid CSS property`,
              );
            }

            // Check for empty values
            if (!value || value.trim() === '') {
              isValid = false;
              warnings.push(`Property '${property}' has an empty value`);
            }

            // Suggest improvements for common cases
            if (
              property === 'color' &&
              !value.startsWith('#') &&
              !value.startsWith('rgb') &&
              !value.startsWith('hsl')
            ) {
              suggestions.push(
                `Consider using a specific color format for '${property}' (e.g., #hex, rgb(), hsl())`,
              );
            }
          }

          // Check if source file exists and is readable
          if (request.sourceFile) {
            try {
              await vscode.workspace.fs.stat(
                vscode.Uri.file(request.sourceFile),
              );
            } catch (error) {
              isValid = false;
              warnings.push(
                `Source file '${request.sourceFile}' could not be found or accessed`,
              );
            }
          }

          sendUpdate.sendUpdate({
            sessionId: request.sessionId,
            step: 'Validation complete',
          });

          return {
            sessionId: request.sessionId,
            result: {
              success: true,
              valid: isValid,
              warnings: warnings.length > 0 ? warnings : undefined,
              suggestions: suggestions.length > 0 ? suggestions : undefined,
            },
          };
        } catch (error) {
          return {
            sessionId: request.sessionId,
            result: {
              success: false,
              valid: false,
              error:
                error instanceof Error
                  ? error.message
                  : 'Unknown error occurred',
            },
          };
        }
      },
    });

    // Track successful server start
    await trackEvent('server_started', {
      port,
    });
  } catch (error) {
    // Track activation error
    await trackEvent('activation_error', {
      error: error instanceof Error ? error.message : String(error),
    });
    vscode.window.showErrorMessage(`Failed to start server: ${error}`);
    throw error;
  }

  // Register the setupToolbar command
  const setupToolbarCommand = vscode.commands.registerCommand(
    'stagewise.setupToolbar',
    async () => {
      try {
        await trackEvent('toolbar_auto_setup_started');
        await setupToolbarHandler();
      } catch (error) {
        console.error(
          'Error during toolbar setup:',
          error instanceof Error ? error.message : String(error),
        );
        throw error;
      }
    },
  );
  context.subscriptions.push(setupToolbarCommand);

  // Register the show getting started command
  const showGettingStartedCommand = vscode.commands.registerCommand(
    'stagewise.showGettingStarted',
    async () => {
      try {
        await trackEvent('getting_started_panel_manual_show');
        createGettingStartedPanel(context, storage, setupToolbarHandler);
      } catch (error) {
        console.error(
          'Error showing getting started panel:',
          error instanceof Error ? error.message : String(error),
        );
        throw error;
      }
    },
  );
  context.subscriptions.push(showGettingStartedCommand);

  if (await shouldShowGettingStarted(storage)) {
    // Show getting started panel for first-time users
    await trackEvent('getting_started_panel_shown');
    createGettingStartedPanel(context, storage, setupToolbarHandler);
  }
}

export async function deactivate() {
  try {
    // Track extension deactivation before shutting down analytics
    await trackEvent('extension_deactivated');
    await stopServer();
    await shutdownAnalytics();
  } catch (error) {
    // Log error but don't throw during deactivation
    console.error(
      'Error during extension deactivation:',
      error instanceof Error ? error.message : String(error),
    );
  }
}
