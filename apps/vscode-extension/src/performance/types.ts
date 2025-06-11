// Performance Optimization Types
// Comprehensive interfaces for performance monitoring, caching, bundling, and optimization

// ==================== Core Performance Types ====================

export interface PerformanceMetrics {
  id: string;
  timestamp: number;
  category: 'memory' | 'cpu' | 'network' | 'rendering' | 'bundle' | 'cache';
  operation: string;
  duration: number;
  memoryUsage?: MemoryUsage;
  networkStats?: NetworkStats;
  bundleStats?: BundleStats;
  cacheStats?: CacheStats;
  metadata?: Record<string, any>;
}

export interface MemoryUsage {
  heapUsed: number;
  heapTotal: number;
  external: number;
  arrayBuffers: number;
  rss: number;
  timestamp: number;
}

export interface NetworkStats {
  requestCount: number;
  responseTime: number;
  bytesTransferred: number;
  compressionRatio?: number;
  cacheHits: number;
  cacheMisses: number;
}

export interface BundleStats {
  entrySize: number;
  compressedSize: number;
  modules: number;
  chunks: number;
  treeshakingEfficiency: number;
  duplicateModules: string[];
  unusedExports: string[];
}

export interface CacheStats {
  hitRate: number;
  missRate: number;
  evictionCount: number;
  totalSize: number;
  entryCount: number;
  averageAccessTime: number;
  memoryUsage: number; // percentage of max cache size
}

// ==================== Performance Configuration ====================

export interface PerformanceConfig {
  monitoring: MonitoringConfig;
  caching: CachingConfig;
  bundling: BundlingConfig;
  optimization: OptimizationConfig;
  thresholds: PerformanceThresholds;
}

export interface MonitoringConfig {
  enabled: boolean;
  sampleRate: number; // 0-1
  metricsRetention: number; // milliseconds
  autoProfile: boolean;
  reportingInterval: number; // milliseconds
  memoryMonitoring: boolean;
  networkMonitoring: boolean;
  renderingMonitoring: boolean;
}

export interface CachingConfig {
  strategies: CacheStrategy[];
  defaultTtl: number;
  maxCacheSize: number; // bytes
  enableCompression: boolean;
  persistToDisk: boolean;
  evictionPolicy: 'lru' | 'lfu' | 'ttl' | 'size';
  preloadStrategies: PreloadStrategy[];
}

export interface BundlingConfig {
  enableTreeshaking: boolean;
  enableMinification: boolean;
  enableCompression: boolean;
  chunkSplitting: ChunkSplittingStrategy;
  codeInstrumentation: boolean;
  sourceMapGeneration: boolean;
  optimization: BundleOptimization;
}

export interface OptimizationConfig {
  lazyLoading: LazyLoadingConfig;
  prefetching: PrefetchingConfig;
  debouncing: DebouncingConfig;
  throttling: ThrottlingConfig;
  memoization: MemoizationConfig;
}

// ==================== Caching System ====================

export interface CacheStrategy {
  name: string;
  type: 'memory' | 'disk' | 'hybrid';
  priority: number;
  maxSize: number;
  ttl: number;
  compression: boolean;
  encryption: boolean;
  patterns: string[]; // glob patterns for what to cache
  exclusions: string[]; // patterns to exclude
}

export interface CacheEntry<T = any> {
  key: string;
  value: T;
  timestamp: number;
  ttl: number;
  accessCount: number;
  lastAccessed: number;
  size: number;
  compressed: boolean;
  metadata?: Record<string, any>;
}

export interface CacheOperation {
  type: 'get' | 'set' | 'delete' | 'clear' | 'evict';
  key: string;
  duration: number;
  hit: boolean;
  size?: number;
}

export interface PreloadStrategy {
  name: string;
  trigger: 'startup' | 'idle' | 'navigation' | 'selection';
  priority: number;
  patterns: string[];
  condition?: string; // JavaScript expression
  maxConcurrency: number;
}

// ==================== Bundle Optimization ====================

export interface ChunkSplittingStrategy {
  type: 'vendor' | 'common' | 'dynamic' | 'manual';
  thresholds: {
    minSize: number;
    maxSize: number;
    maxAsyncRequests: number;
    maxInitialRequests: number;
  };
  cacheGroups: CacheGroup[];
}

export interface CacheGroup {
  name: string;
  test: string; // regex pattern
  priority: number;
  reuseExistingChunk: boolean;
  enforce: boolean;
}

export interface BundleOptimization {
  removeUnusedCode: boolean;
  removeDuplicateModules: boolean;
  optimizeImages: boolean;
  optimizeFonts: boolean;
  enableGzip: boolean;
  enableBrotli: boolean;
  useTerser: boolean;
  useMangling: boolean;
}

export interface BundleAnalysis {
  totalSize: number;
  compressedSize: number;
  modules: ModuleInfo[];
  chunks: ChunkInfo[];
  dependencies: DependencyInfo[];
  duplicates: DuplicateModule[];
  unusedExports: UnusedExport[];
  treeshakingOpportunities: TreeshakingOpportunity[];
}

export interface ModuleInfo {
  id: string;
  name: string;
  size: number;
  compressedSize: number;
  imports: string[];
  exports: string[];
  usedExports: string[];
  unusedExports: string[];
  isEntryPoint: boolean;
  chunks: string[];
}

export interface ChunkInfo {
  id: string;
  name: string;
  size: number;
  modules: string[];
  entryModule?: string;
  isInitial: boolean;
  isAsync: boolean;
  parents: string[];
  children: string[];
}

export interface DependencyInfo {
  name: string;
  version: string;
  size: number;
  isDevDependency: boolean;
  isUnused: boolean;
  isDuplicate: boolean;
  alternatives: string[];
}

export interface DuplicateModule {
  name: string;
  paths: string[];
  size: number;
  instances: number;
}

export interface UnusedExport {
  module: string;
  export: string;
  potentialSavings: number;
}

export interface TreeshakingOpportunity {
  module: string;
  unusedExports: string[];
  potentialSavings: number;
  difficulty: 'easy' | 'medium' | 'hard';
  recommendation: string;
}

// ==================== Performance Optimization Strategies ====================

export interface LazyLoadingConfig {
  enabled: boolean;
  components: string[]; // component patterns
  routes: string[]; // route patterns
  images: boolean;
  scripts: boolean;
  styles: boolean;
  intersectionThreshold: number;
  rootMargin: string;
}

export interface PrefetchingConfig {
  enabled: boolean;
  strategies: PrefetchStrategy[];
  priority: 'high' | 'low' | 'idle';
  maxConcurrency: number;
  bandwidth: 'slow' | 'fast' | 'auto';
}

export interface PrefetchStrategy {
  name: string;
  trigger: 'hover' | 'viewport' | 'interaction' | 'time';
  delay: number;
  patterns: string[];
  condition?: string;
}

export interface DebouncingConfig {
  enabled: boolean;
  operations: DebouncedOperation[];
  defaultDelay: number;
}

export interface DebouncedOperation {
  name: string;
  delay: number;
  maxWait?: number;
  leading?: boolean;
  trailing?: boolean;
}

export interface ThrottlingConfig {
  enabled: boolean;
  operations: ThrottledOperation[];
  defaultInterval: number;
}

export interface ThrottledOperation {
  name: string;
  interval: number;
  leading?: boolean;
  trailing?: boolean;
}

export interface MemoizationConfig {
  enabled: boolean;
  functions: MemoizedFunction[];
  defaultCacheSize: number;
  ttl: number;
}

export interface MemoizedFunction {
  name: string;
  cacheSize: number;
  ttl: number;
  keyGenerator?: string; // function name
  equality?: 'shallow' | 'deep' | 'reference';
}

// ==================== Performance Thresholds ====================

export interface PerformanceThresholds {
  memory: MemoryThresholds;
  cpu: CpuThresholds;
  network: NetworkThresholds;
  rendering: RenderingThresholds;
  bundle: BundleThresholds;
  cache: CacheThresholds;
}

export interface MemoryThresholds {
  heapUsageWarning: number; // MB
  heapUsageCritical: number; // MB
  memoryLeakDetection: boolean;
  gcFrequencyWarning: number; // per minute
}

export interface CpuThresholds {
  usageWarning: number; // percentage
  usageCritical: number; // percentage
  blockingTimeWarning: number; // milliseconds
  blockingTimeCritical: number; // milliseconds
}

export interface NetworkThresholds {
  responseTimeWarning: number; // milliseconds
  responseTimeCritical: number; // milliseconds
  bandwidthUsageWarning: number; // bytes per second
  errorRateWarning: number; // percentage
}

export interface RenderingThresholds {
  fpsWarning: number;
  fpsCritical: number;
  renderTimeWarning: number; // milliseconds
  renderTimeCritical: number; // milliseconds
  layoutShiftWarning: number;
}

export interface BundleThresholds {
  sizeWarning: number; // bytes
  sizeCritical: number; // bytes
  loadTimeWarning: number; // milliseconds
  loadTimeCritical: number; // milliseconds
  treeshakingEfficiencyWarning: number; // percentage
}

export interface CacheThresholds {
  hitRateWarning: number; // percentage
  hitRateCritical: number; // percentage
  evictionRateWarning: number; // per hour
  memoryUsageWarning: number; // percentage of max
}

// ==================== Performance Monitoring ====================

export interface PerformanceProfiler {
  startProfiling(operation: string, metadata?: Record<string, any>): string;
  endProfiling(id: string): PerformanceMetrics;
  mark(name: string): void;
  measure(
    name: string,
    startMark?: string,
    endMark?: string,
  ): PerformanceMetrics;
  getMetrics(filters?: MetricsFilter): PerformanceMetrics[];
  clearMetrics(): void;
  export(): PerformanceReport;
}

export interface MetricsFilter {
  category?: string;
  operation?: string;
  timeRange?: {
    start: number;
    end: number;
  };
  thresholds?: Partial<PerformanceThresholds>;
}

export interface PerformanceReport {
  summary: PerformanceSummary;
  metrics: PerformanceMetrics[];
  recommendations: PerformanceRecommendation[];
  benchmarks: BenchmarkResult[];
  trends: PerformanceTrend[];
}

export interface PerformanceSummary {
  timeRange: { start: number; end: number };
  totalOperations: number;
  averageMemoryUsage: number;
  averageCpuUsage: number;
  averageResponseTime: number;
  cacheHitRate: number;
  bundleSize: number;
  performanceScore: number;
}

export interface PerformanceRecommendation {
  type: 'memory' | 'cpu' | 'network' | 'bundle' | 'cache' | 'rendering';
  severity: 'info' | 'warning' | 'critical';
  title: string;
  description: string;
  impact: 'low' | 'medium' | 'high';
  effort: 'low' | 'medium' | 'high';
  suggestions: string[];
  metrics?: PerformanceMetrics[];
}

export interface BenchmarkResult {
  name: string;
  operation: string;
  iterations: number;
  averageTime: number;
  minTime: number;
  maxTime: number;
  standardDeviation: number;
  memoryUsage: MemoryUsage;
}

export interface PerformanceTrend {
  metric: string;
  period: 'hour' | 'day' | 'week' | 'month';
  dataPoints: Array<{ timestamp: number; value: number }>;
  trend: 'improving' | 'degrading' | 'stable';
  changePercentage: number;
}

// ==================== Performance Events ====================

export interface PerformanceEvent {
  type: PerformanceEventType;
  timestamp: number;
  data: any;
  source: string;
  severity: 'info' | 'warning' | 'error';
}

export type PerformanceEventType =
  | 'memory_threshold_exceeded'
  | 'cpu_threshold_exceeded'
  | 'network_slow_response'
  | 'cache_miss_rate_high'
  | 'bundle_size_increased'
  | 'performance_degradation'
  | 'optimization_opportunity'
  | 'benchmark_completed'
  | 'profiling_started'
  | 'profiling_completed';

// ==================== Service Interfaces ====================

export interface PerformanceOptimizationService {
  initialize(config: PerformanceConfig): Promise<void>;
  startMonitoring(): void;
  stopMonitoring(): void;
  getMetrics(filters?: MetricsFilter): PerformanceMetrics[];
  generateReport(): PerformanceReport;
  analyzeBundle(): Promise<BundleAnalysis>;
  optimizeCache(): Promise<CacheOptimizationResult>;
  benchmark(operation: string, iterations: number): Promise<BenchmarkResult>;
  getRecommendations(): PerformanceRecommendation[];
  exportReport(format: 'json' | 'html' | 'csv'): Promise<string>;
}

export interface CacheOptimizationResult {
  beforeStats: CacheStats;
  afterStats: CacheStats;
  improvements: {
    hitRateImprovement: number;
    sizeReduction: number;
    performanceGain: number;
  };
  actions: string[];
}

// ==================== Export Types ====================

export * from './types';
