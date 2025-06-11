// Bundle Analyzer Implementation

import type * as vscode from 'vscode';
import * as fs from 'node:fs';
import * as path from 'node:path';
import type {
  BundleAnalysis,
  ModuleInfo,
  ChunkInfo,
  DependencyInfo,
  DuplicateModule,
  UnusedExport,
  TreeshakingOpportunity,
  BundlingConfig,
} from './types';

export class BundleAnalyzer {
  private analysisCache: Map<string, BundleAnalysis> = new Map();

  constructor(
    private config: BundlingConfig,
    private outputChannel: vscode.OutputChannel,
    private workspaceRoot?: string,
  ) {
    this.outputChannel.appendLine('BundleAnalyzer initialized');
  }

  async analyze(bundlePath?: string): Promise<BundleAnalysis> {
    const startTime = performance.now();
    this.outputChannel.appendLine('Starting bundle analysis...');

    try {
      // If no specific bundle path, analyze the workspace
      const targetPath = bundlePath || this.workspaceRoot || '';

      // Check cache first
      const cacheKey = `${targetPath}-${Date.now()}`;
      if (this.analysisCache.has(cacheKey)) {
        const cached = this.analysisCache.get(cacheKey)!;
        this.outputChannel.appendLine('Returned cached bundle analysis');
        return cached;
      }

      // Perform analysis
      const analysis = await this.performAnalysis(targetPath);

      // Cache the result
      this.analysisCache.set(cacheKey, analysis);

      const duration = performance.now() - startTime;
      this.outputChannel.appendLine(
        `Bundle analysis completed in ${duration.toFixed(2)}ms`,
      );

      return analysis;
    } catch (error) {
      this.outputChannel.appendLine(`Bundle analysis failed: ${error}`);
      throw error;
    }
  }

  private async performAnalysis(targetPath: string): Promise<BundleAnalysis> {
    // Simulate bundle analysis - in real implementation, this would:
    // 1. Parse webpack stats files
    // 2. Analyze package.json dependencies
    // 3. Scan source files for imports/exports
    // 4. Calculate bundle sizes and dependencies

    const modules = await this.analyzeModules(targetPath);
    const chunks = await this.analyzeChunks(targetPath);
    const dependencies = await this.analyzeDependencies(targetPath);
    const duplicates = this.findDuplicateModules(modules);
    const unusedExports = this.findUnusedExports(modules);
    const treeshakingOpportunities = this.findTreeshakingOpportunities(modules);

    const totalSize = modules.reduce((sum, mod) => sum + mod.size, 0);
    const compressedSize = Math.floor(totalSize * 0.7); // Estimate 30% compression

    return {
      totalSize,
      compressedSize,
      modules,
      chunks,
      dependencies,
      duplicates,
      unusedExports,
      treeshakingOpportunities,
    };
  }

  private async analyzeModules(targetPath: string): Promise<ModuleInfo[]> {
    const modules: ModuleInfo[] = [];

    try {
      // Simulate module analysis by scanning TypeScript/JavaScript files
      const files = await this.findSourceFiles(targetPath);

      for (const file of files.slice(0, 20)) {
        // Limit for simulation
        const relativePath = path.relative(targetPath, file);
        const content = fs.readFileSync(file, 'utf8');
        const size = Buffer.byteLength(content, 'utf8');

        const imports = this.extractImports(content);
        const exports = this.extractExports(content);

        modules.push({
          id: relativePath,
          name: path.basename(file, path.extname(file)),
          size,
          compressedSize: Math.floor(size * 0.7),
          imports,
          exports,
          usedExports: exports.slice(0, Math.floor(exports.length * 0.8)), // 80% used
          unusedExports: exports.slice(Math.floor(exports.length * 0.8)),
          isEntryPoint: file.includes('index') || file.includes('main'),
          chunks: ['main'],
        });
      }
    } catch (error) {
      this.outputChannel.appendLine(`Error analyzing modules: ${error}`);
    }

    return modules;
  }

  private async analyzeChunks(targetPath: string): Promise<ChunkInfo[]> {
    // Simulate chunk analysis
    return [
      {
        id: 'main',
        name: 'main',
        size: 500000, // 500KB
        modules: ['src/index.ts', 'src/app.ts'],
        entryModule: 'src/index.ts',
        isInitial: true,
        isAsync: false,
        parents: [],
        children: ['vendor'],
      },
      {
        id: 'vendor',
        name: 'vendor',
        size: 800000, // 800KB
        modules: ['node_modules/react', 'node_modules/react-dom'],
        isInitial: false,
        isAsync: true,
        parents: ['main'],
        children: [],
      },
    ];
  }

  private async analyzeDependencies(
    targetPath: string,
  ): Promise<DependencyInfo[]> {
    const dependencies: DependencyInfo[] = [];

    try {
      const packageJsonPath = path.join(targetPath, 'package.json');
      if (fs.existsSync(packageJsonPath)) {
        const packageJson = JSON.parse(
          fs.readFileSync(packageJsonPath, 'utf8'),
        );

        // Analyze dependencies
        const deps = {
          ...packageJson.dependencies,
          ...packageJson.devDependencies,
        };

        for (const [name, version] of Object.entries(deps || {})) {
          dependencies.push({
            name,
            version: version as string,
            size: Math.floor(Math.random() * 100000) + 10000, // Random size for simulation
            isDevDependency: !!packageJson.devDependencies?.[name],
            isUnused: Math.random() < 0.1, // 10% chance of being unused
            isDuplicate: Math.random() < 0.05, // 5% chance of being duplicate
            alternatives: [],
          });
        }
      }
    } catch (error) {
      this.outputChannel.appendLine(`Error analyzing dependencies: ${error}`);
    }

    return dependencies;
  }

  private findDuplicateModules(modules: ModuleInfo[]): DuplicateModule[] {
    const duplicates: DuplicateModule[] = [];
    const moduleGroups = new Map<string, ModuleInfo[]>();

    // Group modules by name
    for (const module of modules) {
      const group = moduleGroups.get(module.name) || [];
      group.push(module);
      moduleGroups.set(module.name, group);
    }

    // Find duplicates
    for (const [name, group] of moduleGroups) {
      if (group.length > 1) {
        duplicates.push({
          name,
          paths: group.map((m) => m.id),
          size: group.reduce((sum, m) => sum + m.size, 0),
          instances: group.length,
        });
      }
    }

    return duplicates;
  }

  private findUnusedExports(modules: ModuleInfo[]): UnusedExport[] {
    const unusedExports: UnusedExport[] = [];

    for (const module of modules) {
      for (const unusedExport of module.unusedExports) {
        unusedExports.push({
          module: module.id,
          export: unusedExport,
          potentialSavings: Math.floor(module.size * 0.1), // Estimate 10% savings
        });
      }
    }

    return unusedExports;
  }

  private findTreeshakingOpportunities(
    modules: ModuleInfo[],
  ): TreeshakingOpportunity[] {
    const opportunities: TreeshakingOpportunity[] = [];

    for (const module of modules) {
      if (module.unusedExports.length > 0) {
        const potentialSavings = Math.floor(
          module.size * (module.unusedExports.length / module.exports.length),
        );

        opportunities.push({
          module: module.id,
          unusedExports: module.unusedExports,
          potentialSavings,
          difficulty: potentialSavings > 10000 ? 'easy' : 'medium',
          recommendation: `Remove ${module.unusedExports.length} unused exports to save ~${Math.floor(potentialSavings / 1024)}KB`,
        });
      }
    }

    return opportunities;
  }

  private async findSourceFiles(rootPath: string): Promise<string[]> {
    const files: string[] = [];

    const walk = (dir: string) => {
      try {
        const items = fs.readdirSync(dir);

        for (const item of items) {
          const fullPath = path.join(dir, item);
          const stat = fs.statSync(fullPath);

          if (
            stat.isDirectory() &&
            !item.startsWith('.') &&
            item !== 'node_modules'
          ) {
            walk(fullPath);
          } else if (stat.isFile() && /\.(ts|tsx|js|jsx)$/.test(item)) {
            files.push(fullPath);
          }
        }
      } catch (error) {
        // Ignore errors for directories we can't read
      }
    };

    if (fs.existsSync(rootPath)) {
      walk(rootPath);
    }

    return files;
  }

  private extractImports(content: string): string[] {
    const imports: string[] = [];

    // Simple regex to extract import statements
    const importRegex = /import\s+(?:.*?\s+from\s+)?['"]([^'"]+)['"]/g;
    let match: RegExpExecArray | null;

    match = importRegex.exec(content);
    while (match !== null) {
      imports.push(match[1]);
      match = importRegex.exec(content);
    }

    return imports;
  }

  private extractExports(content: string): string[] {
    const exports: string[] = [];

    // Simple regex to extract exports
    const exportRegex =
      /export\s+(?:const|let|var|function|class|interface|type|enum)\s+(\w+)/g;
    let match: RegExpExecArray | null;

    match = exportRegex.exec(content);
    while (match !== null) {
      exports.push(match[1]);
      match = exportRegex.exec(content);
    }

    // Also check for default exports
    if (content.includes('export default')) {
      exports.push('default');
    }

    return exports;
  }

  generateOptimizationReport(analysis: BundleAnalysis): string {
    const report = [
      '# Bundle Optimization Report',
      '',
      `## Summary`,
      `- Total Size: ${Math.floor(analysis.totalSize / 1024)}KB`,
      `- Compressed Size: ${Math.floor(analysis.compressedSize / 1024)}KB`,
      `- Modules: ${analysis.modules.length}`,
      `- Dependencies: ${analysis.dependencies.length}`,
      '',
      `## Optimization Opportunities`,
      '',
    ];

    // Add treeshaking opportunities
    if (analysis.treeshakingOpportunities.length > 0) {
      report.push('### Tree-shaking Opportunities');
      analysis.treeshakingOpportunities.forEach((opp) => {
        report.push(`- **${opp.module}**: ${opp.recommendation}`);
      });
      report.push('');
    }

    // Add duplicate modules
    if (analysis.duplicates.length > 0) {
      report.push('### Duplicate Modules');
      analysis.duplicates.forEach((dup) => {
        report.push(
          `- **${dup.name}**: ${dup.instances} instances, ${Math.floor(dup.size / 1024)}KB total`,
        );
      });
      report.push('');
    }

    // Add unused exports
    if (analysis.unusedExports.length > 0) {
      const totalSavings = analysis.unusedExports.reduce(
        (sum, exp) => sum + exp.potentialSavings,
        0,
      );
      report.push('### Unused Exports');
      report.push(
        `- Total potential savings: ${Math.floor(totalSavings / 1024)}KB`,
      );
      report.push(`- Unused exports found: ${analysis.unusedExports.length}`);
      report.push('');
    }

    return report.join('\n');
  }

  clearCache(): void {
    this.analysisCache.clear();
    this.outputChannel.appendLine('Bundle analysis cache cleared');
  }

  dispose(): void {
    this.clearCache();
    this.outputChannel.appendLine('BundleAnalyzer disposed');
  }
}
