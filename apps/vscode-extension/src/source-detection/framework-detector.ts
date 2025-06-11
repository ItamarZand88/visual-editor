import * as fs from 'node:fs/promises';
import * as path from 'node:path';
import type { FrameworkDetectionResult } from './types';

interface PackageJson {
  dependencies?: Record<string, string>;
  devDependencies?: Record<string, string>;
  scripts?: Record<string, string>;
  [key: string]: unknown;
}

export class FrameworkDetector {
  private readonly frameworkPatterns = {
    react: {
      packageNames: ['react', 'react-dom', '@types/react'],
      filePatterns: ['*.jsx', '*.tsx'],
      configFiles: ['vite.config.js', 'vite.config.ts', 'webpack.config.js'],
      buildTools: ['next', 'create-react-app', 'vite'],
    },
    vue: {
      packageNames: ['vue', '@vue/core', 'nuxt'],
      filePatterns: ['*.vue'],
      configFiles: [
        'vite.config.js',
        'vite.config.ts',
        'nuxt.config.js',
        'nuxt.config.ts',
      ],
      buildTools: ['nuxt', 'vite', '@vue/cli'],
    },
    angular: {
      packageNames: ['@angular/core', '@angular/common'],
      filePatterns: ['*.component.ts', '*.component.html'],
      configFiles: ['angular.json', 'ng.json'],
      buildTools: ['@angular/cli'],
    },
  };

  public async detectFramework(
    workspaceRoot: string,
  ): Promise<FrameworkDetectionResult> {
    try {
      const packageJsonPath = path.join(workspaceRoot, 'package.json');
      const packageJson = await this.readPackageJson(packageJsonPath);

      if (!packageJson) {
        return await this.detectFromFileSystem(workspaceRoot);
      }

      const detectionResults = await Promise.all([
        this.detectReact(workspaceRoot, packageJson),
        this.detectVue(workspaceRoot, packageJson),
        this.detectAngular(workspaceRoot, packageJson),
      ]);

      // Find the framework with highest confidence
      const bestMatch = detectionResults.reduce((best, current) =>
        current.confidence > best.confidence ? current : best,
      );

      // If confidence is too low, fallback to file system detection
      if (bestMatch.confidence < 0.3) {
        return await this.detectFromFileSystem(workspaceRoot);
      }

      return bestMatch;
    } catch (error) {
      console.error('[FrameworkDetector] Detection failed:', error);
      return {
        framework: 'html',
        confidence: 0.1,
        evidence: ['Framework detection failed, defaulting to HTML'],
      };
    }
  }

  private async readPackageJson(
    packageJsonPath: string,
  ): Promise<PackageJson | null> {
    try {
      const content = await fs.readFile(packageJsonPath, 'utf-8');
      return JSON.parse(content) as PackageJson;
    } catch {
      return null;
    }
  }

  private async detectReact(
    workspaceRoot: string,
    packageJson: PackageJson,
  ): Promise<FrameworkDetectionResult> {
    const evidence: string[] = [];
    let confidence = 0;
    let version: string | undefined;
    let buildTool: string | undefined;

    // Check package.json dependencies
    const allDeps = {
      ...packageJson.dependencies,
      ...packageJson.devDependencies,
    };

    if (allDeps.react) {
      evidence.push('React found in dependencies');
      confidence += 0.4;
      version = allDeps.react;
    }

    if (allDeps['react-dom']) {
      evidence.push('React DOM found in dependencies');
      confidence += 0.2;
    }

    if (allDeps.next) {
      evidence.push('Next.js found in dependencies');
      confidence += 0.3;
      buildTool = 'next';
    }

    if (
      allDeps['create-react-app'] ||
      packageJson.scripts?.start?.includes('react-scripts')
    ) {
      evidence.push('Create React App detected');
      confidence += 0.2;
      buildTool = 'webpack';
    }

    // Check for TypeScript + React
    if (allDeps['@types/react']) {
      evidence.push('React TypeScript types found');
      confidence += 0.1;
    }

    // Check for JSX/TSX files
    const hasJsxFiles = await this.hasFilesWithExtensions(workspaceRoot, [
      '.jsx',
      '.tsx',
    ]);
    if (hasJsxFiles) {
      evidence.push('JSX/TSX files found');
      confidence += 0.2;
    }

    // Check for Vite React config
    const viteConfig = await this.findViteReactConfig(workspaceRoot);
    if (viteConfig) {
      evidence.push('Vite React configuration found');
      confidence += 0.2;
      buildTool = 'vite';
    }

    return {
      framework: 'react',
      confidence: Math.min(confidence, 1),
      evidence,
      version,
      buildTool: buildTool as any,
    };
  }

  private async detectVue(
    workspaceRoot: string,
    packageJson: PackageJson,
  ): Promise<FrameworkDetectionResult> {
    const evidence: string[] = [];
    let confidence = 0;
    let version: string | undefined;
    let buildTool: string | undefined;

    const allDeps = {
      ...packageJson.dependencies,
      ...packageJson.devDependencies,
    };

    if (allDeps.vue) {
      evidence.push('Vue found in dependencies');
      confidence += 0.4;
      version = allDeps.vue;
    }

    if (allDeps.nuxt) {
      evidence.push('Nuxt.js found in dependencies');
      confidence += 0.4;
      buildTool = 'nuxt';
    }

    if (allDeps['@vue/cli-service']) {
      evidence.push('Vue CLI detected');
      confidence += 0.2;
      buildTool = 'webpack';
    }

    // Check for .vue files
    const hasVueFiles = await this.hasFilesWithExtensions(workspaceRoot, [
      '.vue',
    ]);
    if (hasVueFiles) {
      evidence.push('Vue single file components found');
      confidence += 0.3;
    }

    // Check for Nuxt config
    const nuxtConfig = await this.fileExists(workspaceRoot, [
      'nuxt.config.js',
      'nuxt.config.ts',
    ]);
    if (nuxtConfig) {
      evidence.push('Nuxt configuration found');
      confidence += 0.2;
    }

    return {
      framework: 'vue',
      confidence: Math.min(confidence, 1),
      evidence,
      version,
      buildTool: buildTool as any,
    };
  }

  private async detectAngular(
    workspaceRoot: string,
    packageJson: PackageJson,
  ): Promise<FrameworkDetectionResult> {
    const evidence: string[] = [];
    let confidence = 0;
    let version: string | undefined;
    let buildTool: string | undefined;

    const allDeps = {
      ...packageJson.dependencies,
      ...packageJson.devDependencies,
    };

    if (allDeps['@angular/core']) {
      evidence.push('Angular core found in dependencies');
      confidence += 0.4;
      version = allDeps['@angular/core'];
    }

    if (allDeps['@angular/cli']) {
      evidence.push('Angular CLI found in dependencies');
      confidence += 0.2;
      buildTool = 'angular-cli';
    }

    // Check for angular.json
    const angularConfig = await this.fileExists(workspaceRoot, [
      'angular.json',
    ]);
    if (angularConfig) {
      evidence.push('Angular configuration found');
      confidence += 0.3;
    }

    // Check for component files
    const hasComponentFiles = await this.hasFilesWithExtensions(workspaceRoot, [
      '.component.ts',
    ]);
    if (hasComponentFiles) {
      evidence.push('Angular component files found');
      confidence += 0.2;
    }

    return {
      framework: 'angular',
      confidence: Math.min(confidence, 1),
      evidence,
      version,
      buildTool: buildTool as any,
    };
  }

  private async detectFromFileSystem(
    workspaceRoot: string,
  ): Promise<FrameworkDetectionResult> {
    const evidence: string[] = [];
    let framework: 'react' | 'vue' | 'angular' | 'html' = 'html';
    let confidence = 0;

    // Check for framework-specific files
    const hasJsxFiles = await this.hasFilesWithExtensions(workspaceRoot, [
      '.jsx',
      '.tsx',
    ]);
    const hasVueFiles = await this.hasFilesWithExtensions(workspaceRoot, [
      '.vue',
    ]);
    const hasAngularFiles = await this.hasFilesWithExtensions(workspaceRoot, [
      '.component.ts',
    ]);

    if (hasJsxFiles) {
      evidence.push('JSX/TSX files found in file system');
      framework = 'react';
      confidence = 0.6;
    } else if (hasVueFiles) {
      evidence.push('Vue files found in file system');
      framework = 'vue';
      confidence = 0.6;
    } else if (hasAngularFiles) {
      evidence.push('Angular component files found in file system');
      framework = 'angular';
      confidence = 0.6;
    } else {
      evidence.push('No specific framework files found, defaulting to HTML');
      confidence = 0.3;
    }

    return {
      framework,
      confidence,
      evidence,
    };
  }

  private async hasFilesWithExtensions(
    rootPath: string,
    extensions: string[],
  ): Promise<boolean> {
    try {
      const checkDirectory = async (
        dirPath: string,
        depth = 0,
      ): Promise<boolean> => {
        if (depth > 3) return false; // Limit search depth

        const entries = await fs.readdir(dirPath, { withFileTypes: true });

        for (const entry of entries) {
          if (entry.name.startsWith('.') || entry.name === 'node_modules') {
            continue;
          }

          const fullPath = path.join(dirPath, entry.name);

          if (entry.isFile()) {
            const hasMatchingExtension = extensions.some((ext) =>
              entry.name.endsWith(ext),
            );
            if (hasMatchingExtension) {
              return true;
            }
          } else if (entry.isDirectory()) {
            const found = await checkDirectory(fullPath, depth + 1);
            if (found) return true;
          }
        }

        return false;
      };

      return await checkDirectory(rootPath);
    } catch {
      return false;
    }
  }

  private async fileExists(
    rootPath: string,
    filenames: string[],
  ): Promise<boolean> {
    for (const filename of filenames) {
      try {
        const filePath = path.join(rootPath, filename);
        await fs.access(filePath);
        return true;
      } catch {
        // File doesn't exist, continue
      }
    }
    return false;
  }

  private async findViteReactConfig(workspaceRoot: string): Promise<boolean> {
    const configFiles = ['vite.config.js', 'vite.config.ts'];

    for (const configFile of configFiles) {
      try {
        const configPath = path.join(workspaceRoot, configFile);
        const content = await fs.readFile(configPath, 'utf-8');

        // Look for React plugin usage
        if (
          content.includes('@vitejs/plugin-react') ||
          content.includes('react()')
        ) {
          return true;
        }
      } catch {
        // Config file doesn't exist or can't be read
      }
    }

    return false;
  }
}
