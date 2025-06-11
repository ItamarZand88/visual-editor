import { PerformanceOptimizationService } from '../../performance';
import { DEFAULT_PERFORMANCE_CONFIG } from '../../performance';

export class PerformanceHandlers {
  private performanceService: PerformanceOptimizationService;
  private isInitialized = false;

  constructor(workspaceRoot?: string) {
    this.performanceService = new PerformanceOptimizationService(workspaceRoot);
  }

  async initialize(): Promise<void> {
    if (!this.isInitialized) {
      await this.performanceService.initialize(DEFAULT_PERFORMANCE_CONFIG);
      this.isInitialized = true;
    }
  }

  // GET /api/performance/status
  async getStatus(req: any, res: any): Promise<void> {
    try {
      await this.initialize();

      const metrics = this.performanceService.getMetrics({
        timeRange: {
          start: Date.now() - 5 * 60 * 1000, // Last 5 minutes
          end: Date.now(),
        },
      });

      const report = this.performanceService.generateReport();

      res.json({
        success: true,
        data: {
          isMonitoring: true, // Could track this state
          recentMetrics: metrics.slice(-10), // Last 10 metrics
          summary: report.summary,
          lastUpdate: Date.now(),
        },
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        error:
          error instanceof Error ? error.message : 'Unknown error occurred',
      });
    }
  }

  // POST /api/performance/start-monitoring
  async startMonitoring(req: any, res: any): Promise<void> {
    try {
      await this.initialize();
      this.performanceService.startMonitoring();

      res.json({
        success: true,
        message: 'Performance monitoring started',
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        error:
          error instanceof Error ? error.message : 'Failed to start monitoring',
      });
    }
  }

  // POST /api/performance/stop-monitoring
  async stopMonitoring(req: any, res: any): Promise<void> {
    try {
      this.performanceService.stopMonitoring();

      res.json({
        success: true,
        message: 'Performance monitoring stopped',
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        error:
          error instanceof Error ? error.message : 'Failed to stop monitoring',
      });
    }
  }

  // GET /api/performance/metrics
  async getMetrics(req: any, res: any): Promise<void> {
    try {
      await this.initialize();

      const { category, operation, startTime, endTime } = req.query;

      const filters: any = {};
      if (category) filters.category = category;
      if (operation) filters.operation = operation;
      if (startTime && endTime) {
        filters.timeRange = {
          start: Number.parseInt(startTime),
          end: Number.parseInt(endTime),
        };
      }

      const metrics = this.performanceService.getMetrics(filters);

      res.json({
        success: true,
        data: {
          metrics,
          count: metrics.length,
          filters: filters,
        },
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : 'Failed to get metrics',
      });
    }
  }

  // GET /api/performance/report
  async getReport(req: any, res: any): Promise<void> {
    try {
      await this.initialize();

      const { format = 'json' } = req.query;

      if (format === 'json') {
        const report = this.performanceService.generateReport();
        res.json({
          success: true,
          data: report,
        });
      } else {
        const reportContent =
          await this.performanceService.exportReport(format);

        const contentTypes = {
          html: 'text/html',
          csv: 'text/csv',
        };

        res.setHeader(
          'Content-Type',
          contentTypes[format as keyof typeof contentTypes] || 'text/plain',
        );
        res.send(reportContent);
      }
    } catch (error) {
      res.status(500).json({
        success: false,
        error:
          error instanceof Error ? error.message : 'Failed to generate report',
      });
    }
  }

  // POST /api/performance/bundle-analysis
  async analyzBundle(req: any, res: any): Promise<void> {
    try {
      await this.initialize();

      const { bundlePath } = req.body;
      const analysis = await this.performanceService.analyzeBundle();

      res.json({
        success: true,
        data: analysis,
        timestamp: Date.now(),
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        error:
          error instanceof Error ? error.message : 'Bundle analysis failed',
      });
    }
  }

  // POST /api/performance/optimize-cache
  async optimizeCache(req: any, res: any): Promise<void> {
    try {
      await this.initialize();

      const result = await this.performanceService.optimizeCache();

      res.json({
        success: true,
        data: result,
        timestamp: Date.now(),
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        error:
          error instanceof Error ? error.message : 'Cache optimization failed',
      });
    }
  }

  // POST /api/performance/benchmark
  async runBenchmark(req: any, res: any): Promise<void> {
    try {
      await this.initialize();

      const { operation, iterations = 10 } = req.body;

      if (!operation) {
        res.status(400).json({
          success: false,
          error: 'Operation name is required',
        });
        return;
      }

      const benchmark = await this.performanceService.benchmark(
        operation,
        iterations,
      );

      res.json({
        success: true,
        data: benchmark,
        timestamp: Date.now(),
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : 'Benchmark failed',
      });
    }
  }

  // GET /api/performance/recommendations
  async getRecommendations(req: any, res: any): Promise<void> {
    try {
      await this.initialize();

      const recommendations = this.performanceService.getRecommendations();

      res.json({
        success: true,
        data: {
          recommendations,
          count: recommendations.length,
          timestamp: Date.now(),
        },
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        error:
          error instanceof Error
            ? error.message
            : 'Failed to get recommendations',
      });
    }
  }

  // GET /api/performance/config
  async getConfig(req: any, res: any): Promise<void> {
    try {
      res.json({
        success: true,
        data: {
          config: DEFAULT_PERFORMANCE_CONFIG,
          description: 'Current performance optimization configuration',
        },
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : 'Failed to get config',
      });
    }
  }

  dispose(): void {
    if (this.performanceService) {
      this.performanceService.dispose();
    }
  }
}
