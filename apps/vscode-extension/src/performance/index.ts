// Performance Optimization Module
// Main exports for the performance optimization system

export { PerformanceProfiler } from './performance-profiler';
export { CacheManager } from './cache-manager';
export { BundleAnalyzer } from './bundle-analyzer';
export { PerformanceOptimizationService } from './performance-optimizer';

// Export all types
export * from './types';

// Default configuration
export const DEFAULT_PERFORMANCE_CONFIG = {
  monitoring: {
    enabled: true,
    sampleRate: 0.1, // 10% sampling
    metricsRetention: 24 * 60 * 60 * 1000, // 24 hours
    autoProfile: true,
    reportingInterval: 5 * 60 * 1000, // 5 minutes
    memoryMonitoring: true,
    networkMonitoring: true,
    renderingMonitoring: false,
  },
  caching: {
    strategies: [
      {
        name: 'high-priority',
        type: 'memory' as const,
        priority: 1,
        maxSize: 50 * 1024 * 1024, // 50MB
        ttl: 30 * 60 * 1000, // 30 minutes
        compression: false,
        encryption: false,
        patterns: ['source-detection:*', 'component-library:*'],
        exclusions: ['*.temp', '*.tmp'],
      },
      {
        name: 'component-data',
        type: 'hybrid' as const,
        priority: 2,
        maxSize: 30 * 1024 * 1024, // 30MB
        ttl: 60 * 60 * 1000, // 1 hour
        compression: true,
        encryption: false,
        patterns: ['components:*', 'frameworks:*'],
        exclusions: [],
      },
    ],
    defaultTtl: 30 * 60 * 1000, // 30 minutes
    maxCacheSize: 100 * 1024 * 1024, // 100MB
    enableCompression: true,
    persistToDisk: false,
    evictionPolicy: 'lru' as const,
    preloadStrategies: [
      {
        name: 'startup-preload',
        trigger: 'startup' as const,
        priority: 1,
        patterns: ['source-detection:framework-info'],
        maxConcurrency: 3,
      },
    ],
  },
  bundling: {
    enableTreeshaking: true,
    enableMinification: true,
    enableCompression: true,
    chunkSplitting: {
      type: 'vendor' as const,
      thresholds: {
        minSize: 20000,
        maxSize: 244000,
        maxAsyncRequests: 30,
        maxInitialRequests: 30,
      },
      cacheGroups: [],
    },
    codeInstrumentation: false,
    sourceMapGeneration: false,
    optimization: {
      removeUnusedCode: true,
      removeDuplicateModules: true,
      optimizeImages: false,
      optimizeFonts: false,
      enableGzip: true,
      enableBrotli: false,
      useTerser: true,
      useMangling: true,
    },
  },
  optimization: {
    lazyLoading: {
      enabled: true,
      components: ['*.lazy.*'],
      routes: ['/admin/*', '/settings/*'],
      images: true,
      scripts: true,
      styles: false,
      intersectionThreshold: 0.1,
      rootMargin: '50px',
    },
    prefetching: {
      enabled: true,
      strategies: [
        {
          name: 'hover-prefetch',
          trigger: 'hover' as const,
          delay: 200,
          patterns: ['components:*'],
          condition: 'user.isActive',
        },
      ],
      priority: 'low' as const,
      maxConcurrency: 2,
      bandwidth: 'auto' as const,
    },
    debouncing: {
      enabled: true,
      operations: [
        {
          name: 'search',
          delay: 300,
          maxWait: 1000,
          leading: false,
          trailing: true,
        },
      ],
      defaultDelay: 250,
    },
    throttling: {
      enabled: true,
      operations: [
        {
          name: 'scroll',
          interval: 16, // 60fps
          leading: true,
          trailing: false,
        },
      ],
      defaultInterval: 100,
    },
    memoization: {
      enabled: true,
      functions: [
        {
          name: 'expensive-calculation',
          cacheSize: 100,
          ttl: 60000,
          equality: 'deep' as const,
        },
      ],
      defaultCacheSize: 50,
      ttl: 300000, // 5 minutes
    },
  },
  thresholds: {
    memory: {
      heapUsageWarning: 100, // MB
      heapUsageCritical: 200, // MB
      memoryLeakDetection: true,
      gcFrequencyWarning: 10, // per minute
    },
    cpu: {
      usageWarning: 70, // percentage
      usageCritical: 90, // percentage
      blockingTimeWarning: 50, // milliseconds
      blockingTimeCritical: 100, // milliseconds
    },
    network: {
      responseTimeWarning: 1000, // milliseconds
      responseTimeCritical: 3000, // milliseconds
      bandwidthUsageWarning: 1024 * 1024, // bytes per second
      errorRateWarning: 5, // percentage
    },
    rendering: {
      fpsWarning: 45,
      fpsCritical: 30,
      renderTimeWarning: 16, // milliseconds (60fps)
      renderTimeCritical: 33, // milliseconds (30fps)
      layoutShiftWarning: 0.1,
    },
    bundle: {
      sizeWarning: 2 * 1024 * 1024, // 2MB
      sizeCritical: 5 * 1024 * 1024, // 5MB
      loadTimeWarning: 3000, // milliseconds
      loadTimeCritical: 5000, // milliseconds
      treeshakingEfficiencyWarning: 70, // percentage
    },
    cache: {
      hitRateWarning: 70, // percentage
      hitRateCritical: 50, // percentage
      evictionRateWarning: 50, // per hour
      memoryUsageWarning: 80, // percentage of max
    },
  },
};
