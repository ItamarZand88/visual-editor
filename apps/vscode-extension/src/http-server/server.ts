import express from 'express';
import type { Server } from 'node:http';
import cors from 'cors';
import * as vscode from 'vscode';
import { handleStreamableHttp } from './handlers/mcp';
import { handleSse, handleSsePost } from './handlers/sse';
import { StyleManagementHandler } from './handlers/style-management-handler';
import { CodeModificationHandler } from './handlers/code-modification-handler';
import { ComponentLibraryHandlers } from './handlers/component-library-handlers';
import { PerformanceHandlers } from './handlers/performance-handlers';
import { errorHandler } from './middleware/error';
import { LibraryIntegrationService } from '../component-library/library-integration-service';
import {
  DEFAULT_PORT,
  PING_ENDPOINT,
  PING_RESPONSE,
} from '@stagewise/extension-toolbar-srpc-contract';

const createServer = (port: number) => {
  const app = express();

  // Middleware
  app.use(express.json());
  app.use(
    cors({
      origin: '*',
      methods: ['GET', 'POST', 'PATCH', 'PUT', 'DELETE'],
      allowedHeaders: ['Content-Type'],
    }),
  );

  // Get workspace root for handlers
  const workspaceRoot =
    vscode.workspace.workspaceFolders?.[0]?.uri.fsPath || process.cwd();

  // Initialize handlers
  const styleManagementHandler = new StyleManagementHandler(workspaceRoot);
  const codeModificationHandler = new CodeModificationHandler();
  const libraryIntegrationService = new LibraryIntegrationService(
    workspaceRoot,
  );
  const componentLibraryHandlers = new ComponentLibraryHandlers(
    libraryIntegrationService,
  );
  const performanceHandlers = new PerformanceHandlers(workspaceRoot);

  // Routes
  // Ping-route which will allow the toolbar to find out the correct port, starting with DEFAULT_PORT
  app.get(PING_ENDPOINT, (_req: express.Request, res: express.Response) => {
    res.send(PING_RESPONSE);
  });

  // MCP and SSE routes
  app.all('/mcp', handleStreamableHttp);
  app.get('/sse', handleSse);
  app.post('/sse-messages', handleSsePost);

  // Style Management API routes
  app.post(
    '/api/style-management/initialize',
    styleManagementHandler.initialize,
  );
  app.get(
    '/api/style-management/frameworks',
    styleManagementHandler.getFrameworks,
  );
  app.get(
    '/api/style-management/design-system',
    styleManagementHandler.getDesignSystem,
  );
  app.post(
    '/api/style-management/generate-styles',
    styleManagementHandler.generateStyles,
  );
  app.post(
    '/api/style-management/validate-styles',
    styleManagementHandler.validateStyles,
  );
  app.post(
    '/api/style-management/suggest-tokens',
    styleManagementHandler.suggestTokens,
  );
  app.post(
    '/api/style-management/convert-styles',
    styleManagementHandler.convertStyles,
  );
  app.get(
    '/api/style-management/recommendations',
    styleManagementHandler.getRecommendations,
  );
  app.get('/api/style-management/strategy', styleManagementHandler.getStrategy);
  app.post('/api/style-management/refresh', styleManagementHandler.refresh);
  app.delete('/api/style-management/cache', styleManagementHandler.clearCache);

  // Code Modification API routes
  app.post(
    '/api/code-modification/apply-styles',
    codeModificationHandler.applyStyles,
  );
  app.post(
    '/api/code-modification/rollback',
    codeModificationHandler.rollbackChanges,
  );
  app.get(
    '/api/code-modification/backup-history',
    codeModificationHandler.getBackupHistory,
  );
  app.get('/api/code-modification/config', codeModificationHandler.getConfig);
  app.put(
    '/api/code-modification/config',
    codeModificationHandler.updateConfig,
  );
  app.get(
    '/api/code-modification/backup-stats',
    codeModificationHandler.getBackupStats,
  );

  // Component Library Integration API routes
  app.post(
    '/api/component-library/initialize',
    componentLibraryHandlers.initialize,
  );
  app.get(
    '/api/component-library/libraries',
    componentLibraryHandlers.getLibraries,
  );
  app.get(
    '/api/component-library/config/:library',
    componentLibraryHandlers.getLibraryConfig,
  );
  app.patch(
    '/api/component-library/config/:library',
    componentLibraryHandlers.updateLibraryConfig,
  );
  app.get(
    '/api/component-library/mapping',
    componentLibraryHandlers.getComponentMapping,
  );
  app.get(
    '/api/component-library/suggestions',
    componentLibraryHandlers.getComponentSuggestions,
  );
  app.post(
    '/api/component-library/migrate',
    componentLibraryHandlers.generateMigrationCode,
  );
  app.post(
    '/api/component-library/analyze-migration',
    componentLibraryHandlers.analyzeMigrationComplexity,
  );
  app.get(
    '/api/component-library/analysis/:library',
    componentLibraryHandlers.getLibraryAnalysis,
  );
  app.get(
    '/api/component-library/design-system/:library',
    componentLibraryHandlers.getDesignSystem,
  );
  app.get(
    '/api/component-library/components/:library',
    componentLibraryHandlers.getComponentDefinitions,
  );
  app.get(
    '/api/component-library/search',
    componentLibraryHandlers.searchComponents,
  );
  app.get(
    '/api/component-library/recommendations',
    componentLibraryHandlers.getRecommendations,
  );
  app.post(
    '/api/component-library/refresh',
    componentLibraryHandlers.refreshDetection,
  );

  // Performance Optimization API routes
  app.get(
    '/api/performance/status',
    performanceHandlers.getStatus.bind(performanceHandlers),
  );
  app.post(
    '/api/performance/start-monitoring',
    performanceHandlers.startMonitoring.bind(performanceHandlers),
  );
  app.post(
    '/api/performance/stop-monitoring',
    performanceHandlers.stopMonitoring.bind(performanceHandlers),
  );
  app.get(
    '/api/performance/metrics',
    performanceHandlers.getMetrics.bind(performanceHandlers),
  );
  app.get(
    '/api/performance/report',
    performanceHandlers.getReport.bind(performanceHandlers),
  );
  app.post(
    '/api/performance/bundle-analysis',
    performanceHandlers.analyzBundle.bind(performanceHandlers),
  );
  app.post(
    '/api/performance/optimize-cache',
    performanceHandlers.optimizeCache.bind(performanceHandlers),
  );
  app.post(
    '/api/performance/benchmark',
    performanceHandlers.runBenchmark.bind(performanceHandlers),
  );
  app.get(
    '/api/performance/recommendations',
    performanceHandlers.getRecommendations.bind(performanceHandlers),
  );
  app.get(
    '/api/performance/config',
    performanceHandlers.getConfig.bind(performanceHandlers),
  );

  // Error handling
  app.use(errorHandler);

  // 404 handler
  app.use(
    (
      _req: express.Request,
      _res: express.Response,
      next: express.NextFunction,
    ) => {
      _res.status(404).json({ error: 'Not found' });
    },
  );

  return app;
};

let server: ReturnType<typeof express.application.listen> | null = null;

export const startServer = async (
  port: number = DEFAULT_PORT,
): Promise<Server> => {
  const app = createServer(port);
  return await app.listen(port, () => {});
};

export const stopServer = (): Promise<void> => {
  return new Promise((resolve, reject) => {
    if (!server) {
      resolve();
      return;
    }
    server.close((err) => {
      if (err) {
        reject(err);
      } else {
        resolve();
      }
    });
    server = null;
  });
};
