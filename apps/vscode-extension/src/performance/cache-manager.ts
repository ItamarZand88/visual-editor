import type * as vscode from 'vscode';
import * as fs from 'node:fs';
import * as path from 'node:path';
import * as os from 'node:os';
import type { CacheEntry, CacheStats, CachingConfig } from './types';

export class CacheManager {
  private memoryCache: Map<string, CacheEntry> = new Map();
  private diskCacheDirectory: string;
  private stats: CacheStats = {
    hitRate: 0,
    missRate: 0,
    evictionCount: 0,
    totalSize: 0,
    entryCount: 0,
    averageAccessTime: 0,
    memoryUsage: 0,
  };
  private totalRequests = 0;
  private totalHits = 0;

  constructor(
    private config: CachingConfig,
    private outputChannel: vscode.OutputChannel,
    private workspaceRoot?: string,
  ) {
    this.diskCacheDirectory = path.join(
      workspaceRoot || os.tmpdir(),
      '.stagewise-cache',
    );
    this.ensureCacheDirectory();
    this.outputChannel.appendLine('CacheManager initialized');
  }

  private ensureCacheDirectory(): void {
    try {
      if (!fs.existsSync(this.diskCacheDirectory)) {
        fs.mkdirSync(this.diskCacheDirectory, { recursive: true });
      }
    } catch (error) {
      this.outputChannel.appendLine(
        `Failed to create cache directory: ${error}`,
      );
    }
  }

  async get<T>(key: string): Promise<T | null> {
    const startTime = performance.now();
    this.totalRequests++;

    try {
      const entry = this.memoryCache.get(key);
      if (entry && !this.isExpired(entry)) {
        entry.accessCount++;
        entry.lastAccessed = Date.now();
        this.totalHits++;
        this.updateStats();
        return entry.value as T;
      }

      this.updateStats();
      return null;
    } catch (error) {
      this.outputChannel.appendLine(`Cache get error for key ${key}: ${error}`);
      return null;
    }
  }

  async set<T>(
    key: string,
    value: T,
    options?: { ttl?: number },
  ): Promise<void> {
    try {
      const ttl = options?.ttl || this.config.defaultTtl;
      const entry: CacheEntry<T> = {
        key,
        value,
        timestamp: Date.now(),
        ttl,
        accessCount: 1,
        lastAccessed: Date.now(),
        size: this.estimateSize(value),
        compressed: false,
      };

      this.memoryCache.set(key, entry);
      this.updateStats();
    } catch (error) {
      this.outputChannel.appendLine(`Cache set error for key ${key}: ${error}`);
    }
  }

  async delete(key: string): Promise<boolean> {
    try {
      const existed = this.memoryCache.has(key);
      this.memoryCache.delete(key);
      this.updateStats();
      return existed;
    } catch (error) {
      this.outputChannel.appendLine(
        `Cache delete error for key ${key}: ${error}`,
      );
      return false;
    }
  }

  async clear(): Promise<void> {
    try {
      this.memoryCache.clear();
      this.stats.entryCount = 0;
      this.stats.totalSize = 0;
      this.stats.evictionCount = 0;
      this.updateStats();
    } catch (error) {
      this.outputChannel.appendLine(`Cache clear error: ${error}`);
    }
  }

  getStats(): CacheStats {
    this.updateStats();
    return { ...this.stats };
  }

  async preload(patterns: string[]): Promise<void> {
    this.outputChannel.appendLine(
      `Cache preload for patterns: ${patterns.join(', ')}`,
    );
    // Simplified preload implementation
  }

  private isExpired(entry: CacheEntry): boolean {
    return Date.now() - entry.timestamp > entry.ttl;
  }

  private estimateSize(value: any): number {
    const jsonString = JSON.stringify(value);
    return new TextEncoder().encode(jsonString).length;
  }

  private updateStats(): void {
    this.stats.entryCount = this.memoryCache.size;
    this.stats.totalSize = Array.from(this.memoryCache.values()).reduce(
      (sum, entry) => sum + entry.size,
      0,
    );
    this.stats.hitRate =
      this.totalRequests > 0 ? (this.totalHits / this.totalRequests) * 100 : 0;
    this.stats.missRate = 100 - this.stats.hitRate;
    this.stats.memoryUsage =
      this.config.maxCacheSize > 0
        ? (this.stats.totalSize / this.config.maxCacheSize) * 100
        : 0;
  }

  dispose(): void {
    this.memoryCache.clear();
    this.outputChannel.appendLine('CacheManager disposed');
  }
}
