import type * as vscode from 'vscode';
import type {
  PerformanceMetrics,
  PerformanceReport,
  MetricsFilter,
  MemoryUsage,
  PerformanceThresholds,
  MonitoringConfig,
} from './types';

export class PerformanceProfiler {
  private metrics: PerformanceMetrics[] = [];
  private activeProfiles: Map<
    string,
    { start: number; operation: string; metadata?: Record<string, any> }
  > = new Map();

  constructor(
    private config: MonitoringConfig,
    private thresholds: PerformanceThresholds,
    private outputChannel: vscode.OutputChannel,
  ) {
    this.outputChannel.appendLine('PerformanceProfiler initialized');
  }

  startProfiling(operation: string, metadata?: Record<string, any>): string {
    const id = `profile-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    this.activeProfiles.set(id, {
      start: performance.now(),
      operation,
      metadata,
    });
    return id;
  }

  endProfiling(id: string): PerformanceMetrics {
    const profile = this.activeProfiles.get(id);
    if (!profile) {
      throw new Error(`Profile with id ${id} not found`);
    }

    this.activeProfiles.delete(id);
    const duration = performance.now() - profile.start;

    const metrics: PerformanceMetrics = {
      id,
      timestamp: Date.now(),
      category: 'memory',
      operation: profile.operation,
      duration,
      memoryUsage: this.getCurrentMemoryUsage(),
      metadata: profile.metadata,
    };

    this.metrics.push(metrics);
    return metrics;
  }

  mark(name: string): void {
    // Simple mark implementation
    performance.mark(name);
  }

  measure(
    name: string,
    startMark?: string,
    endMark?: string,
  ): PerformanceMetrics {
    const start = startMark
      ? performance.getEntriesByName(startMark)[0]?.startTime || 0
      : 0;
    const end = endMark
      ? performance.getEntriesByName(endMark)[0]?.startTime || performance.now()
      : performance.now();

    const metrics: PerformanceMetrics = {
      id: `measure-${Date.now()}`,
      timestamp: Date.now(),
      category: 'memory',
      operation: name,
      duration: end - start,
      memoryUsage: this.getCurrentMemoryUsage(),
    };

    this.metrics.push(metrics);
    return metrics;
  }

  getMetrics(filters?: MetricsFilter): PerformanceMetrics[] {
    let filteredMetrics = [...this.metrics];

    if (filters?.category) {
      filteredMetrics = filteredMetrics.filter(
        (m) => m.category === filters.category,
      );
    }

    if (filters?.operation) {
      filteredMetrics = filteredMetrics.filter(
        (m) => m.operation === filters.operation,
      );
    }

    if (filters?.timeRange) {
      filteredMetrics = filteredMetrics.filter(
        (m) =>
          m.timestamp >= filters.timeRange!.start &&
          m.timestamp <= filters.timeRange!.end,
      );
    }

    return filteredMetrics;
  }

  clearMetrics(): void {
    this.metrics = [];
    this.outputChannel.appendLine('Performance metrics cleared');
  }

  export(): PerformanceReport {
    const summary = {
      timeRange: {
        start:
          this.metrics.length > 0
            ? Math.min(...this.metrics.map((m) => m.timestamp))
            : Date.now(),
        end: Date.now(),
      },
      totalOperations: this.metrics.length,
      averageMemoryUsage:
        this.metrics.reduce(
          (sum, m) => sum + (m.memoryUsage?.heapUsed || 0),
          0,
        ) / Math.max(this.metrics.length, 1),
      averageCpuUsage: 0,
      averageResponseTime:
        this.metrics.reduce((sum, m) => sum + m.duration, 0) /
        Math.max(this.metrics.length, 1),
      cacheHitRate: 0,
      bundleSize: 0,
      performanceScore: 100,
    };

    return {
      summary,
      metrics: this.metrics,
      recommendations: [],
      benchmarks: [],
      trends: [],
    };
  }

  private getCurrentMemoryUsage(): MemoryUsage {
    const usage = process.memoryUsage();
    return {
      heapUsed: usage.heapUsed / 1024 / 1024, // Convert to MB
      heapTotal: usage.heapTotal / 1024 / 1024,
      external: usage.external / 1024 / 1024,
      arrayBuffers: usage.arrayBuffers / 1024 / 1024,
      rss: usage.rss / 1024 / 1024,
      timestamp: Date.now(),
    };
  }
}
