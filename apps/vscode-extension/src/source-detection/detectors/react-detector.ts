import * as fs from 'node:fs/promises';
import * as path from 'node:path';
import type {
  ElementSourceInfo,
  ComponentHierarchy,
  ComponentMatch,
  SourceSearchOptions,
} from '../types';
import { FileSystemService } from '../file-system-service';

export class ReactDetector {
  private fileSystemService = new FileSystemService();

  public async findElementSource(
    elementInfo: {
      tagName: string;
      id?: string;
      className?: string;
      textContent?: string;
      attributes?: Record<string, string>;
    },
    workspaceRoot: string,
  ): Promise<ElementSourceInfo | null> {
    try {
      // Get all React files
      const reactFiles = await this.findReactFiles(workspaceRoot);

      // Search for the element in React files
      for (const filePath of reactFiles) {
        const sourceInfo = await this.searchElementInFile(
          elementInfo,
          filePath,
        );
        if (sourceInfo) {
          return sourceInfo;
        }
      }

      return null;
    } catch (error) {
      console.error('[ReactDetector] Element source detection failed:', error);
      return null;
    }
  }

  public async buildComponentHierarchy(
    workspaceRoot: string,
  ): Promise<ComponentHierarchy | null> {
    try {
      const reactFiles = await this.findReactFiles(workspaceRoot);
      const components = new Map<string, ComponentHierarchy>();

      // First pass: identify all components
      for (const filePath of reactFiles) {
        const componentInfo = await this.extractComponentInfo(filePath);
        if (componentInfo) {
          components.set(componentInfo.componentName, componentInfo);
        }
      }

      // Second pass: build relationships
      for (const filePath of reactFiles) {
        await this.buildComponentRelationships(filePath, components);
      }

      // Find root components (components not used by others)
      const rootComponents = Array.from(components.values()).filter(
        (comp) => !comp.parent,
      );

      // Return the first root component or create a virtual root
      if (rootComponents.length > 0) {
        return rootComponents[0];
      }

      return null;
    } catch (error) {
      console.error(
        '[ReactDetector] Component hierarchy building failed:',
        error,
      );
      return null;
    }
  }

  public async searchComponents(
    query: string,
    options: SourceSearchOptions,
  ): Promise<ComponentMatch[]> {
    try {
      const reactFiles = await this.findReactFiles(options.rootPath);
      const matches: ComponentMatch[] = [];

      for (const filePath of reactFiles) {
        const fileMatches = await this.searchComponentsInFile(query, filePath);
        matches.push(...fileMatches);
      }

      return matches.sort((a, b) => b.confidence - a.confidence);
    } catch (error) {
      console.error('[ReactDetector] Component search failed:', error);
      return [];
    }
  }

  private async findReactFiles(workspaceRoot: string): Promise<string[]> {
    return this.fileSystemService.findFiles(
      workspaceRoot,
      ['**/*.jsx', '**/*.tsx'],
      ['node_modules', '.git', 'dist', 'build'],
    );
  }

  private async searchElementInFile(
    elementInfo: {
      tagName: string;
      id?: string;
      className?: string;
      textContent?: string;
    },
    filePath: string,
  ): Promise<ElementSourceInfo | null> {
    try {
      const content = await fs.readFile(filePath, 'utf-8');
      const lines = content.split('\n');

      // Look for JSX elements matching the criteria
      for (let i = 0; i < lines.length; i++) {
        const line = lines[i];
        const trimmedLine = line.trim();

        // Skip comments and non-JSX lines
        if (trimmedLine.startsWith('//') || trimmedLine.startsWith('/*')) {
          continue;
        }

        // Check for element patterns
        const elementMatch = this.findElementInLine(elementInfo, line);
        if (elementMatch) {
          return {
            filePath,
            lineNumber: i + 1,
            columnNumber: elementMatch.column,
            componentName:
              (await this.extractComponentName(filePath)) || 'Unknown',
            framework: 'react',
            elementType: this.isReactComponent(elementInfo.tagName)
              ? 'component'
              : 'element',
            confidence: elementMatch.confidence,
            additionalInfo: {
              moduleType: filePath.endsWith('.tsx') ? 'tsx' : 'jsx',
            },
          };
        }
      }

      return null;
    } catch (error) {
      console.warn(
        `[ReactDetector] Failed to search in file: ${filePath}`,
        error,
      );
      return null;
    }
  }

  private findElementInLine(
    elementInfo: {
      tagName: string;
      id?: string;
      className?: string;
      textContent?: string;
    },
    line: string,
  ): { column: number; confidence: number } | null {
    let confidence = 0;
    let foundTagMatch = false;

    // Look for opening tag
    const tagPattern = new RegExp(`<${elementInfo.tagName}\\b`, 'i');
    const tagMatch = line.match(tagPattern);

    if (!tagMatch) {
      return null;
    }

    foundTagMatch = true;
    confidence += 0.3;

    // Check for id match
    if (elementInfo.id) {
      const idPattern = new RegExp(`id=["'\`]${elementInfo.id}["'\`]`, 'i');
      if (idPattern.test(line)) {
        confidence += 0.4;
      }
    }

    // Check for className match
    if (elementInfo.className) {
      const classNames = elementInfo.className.split(' ').filter(Boolean);
      for (const className of classNames) {
        const classPattern = new RegExp(
          `className=["'\`][^"'\`]*\\b${className}\\b[^"'\`]*["'\`]`,
          'i',
        );
        if (classPattern.test(line)) {
          confidence += 0.2;
        }
      }
    }

    // Check for text content in simple cases
    if (elementInfo.textContent && elementInfo.textContent.length > 3) {
      const textPattern = new RegExp(
        this.escapeRegex(elementInfo.textContent.substring(0, 20)),
        'i',
      );
      if (textPattern.test(line)) {
        confidence += 0.2;
      }
    }

    return foundTagMatch
      ? {
          column: tagMatch.index! + 1,
          confidence: Math.min(confidence, 1),
        }
      : null;
  }

  private async extractComponentInfo(
    filePath: string,
  ): Promise<ComponentHierarchy | null> {
    try {
      const componentName = await this.extractComponentName(filePath);

      if (!componentName) {
        return null;
      }

      return {
        componentName,
        filePath,
        framework: 'react',
        children: [],
        depth: 0,
      };
    } catch {
      return null;
    }
  }

  private async buildComponentRelationships(
    filePath: string,
    components: Map<string, ComponentHierarchy>,
  ): Promise<void> {
    try {
      const content = await fs.readFile(filePath, 'utf-8');
      const parentComponent = components.get(
        (await this.extractComponentName(filePath)) || '',
      );

      if (!parentComponent) {
        return;
      }

      // Find component usages in JSX
      const componentUsages = this.findComponentUsages(content);

      for (const usedComponentName of componentUsages) {
        const childComponent = components.get(usedComponentName);
        if (childComponent && childComponent !== parentComponent) {
          childComponent.parent = parentComponent;
          parentComponent.children.push(childComponent);
          childComponent.depth = parentComponent.depth + 1;
        }
      }
    } catch (error) {
      console.warn(
        `[ReactDetector] Failed to build relationships for: ${filePath}`,
        error,
      );
    }
  }

  private findComponentUsages(content: string): string[] {
    const components: string[] = [];

    // Match JSX component usage: <ComponentName or <ComponentName.SubComponent
    const componentPattern = /<([A-Z][a-zA-Z0-9]*(?:\.[A-Z][a-zA-Z0-9]*)*)/g;
    let match: RegExpExecArray | null;

    match = componentPattern.exec(content);
    while (match !== null) {
      const componentName = match[1].split('.')[0]; // Get base component name
      if (!components.includes(componentName)) {
        components.push(componentName);
      }
      match = componentPattern.exec(content);
    }

    return components;
  }

  private async searchComponentsInFile(
    query: string,
    filePath: string,
  ): Promise<ComponentMatch[]> {
    try {
      const content = await fs.readFile(filePath, 'utf-8');
      const lines = content.split('\n');
      const matches: ComponentMatch[] = [];

      const componentName = await this.extractComponentName(filePath);
      if (!componentName) {
        return matches;
      }

      // Check if component name matches query
      const nameMatch = this.calculateMatchScore(query, componentName);
      if (nameMatch.score > 0.3) {
        const componentLine = this.findComponentDeclarationLine(
          content,
          componentName,
        );

        matches.push({
          filePath,
          componentName,
          framework: 'react',
          confidence: nameMatch.score,
          matchType: nameMatch.type,
          location: {
            line: componentLine.line,
            column: componentLine.column,
            endLine: componentLine.line,
            endColumn: componentLine.column + componentName.length,
          },
          context: {
            beforeLines: lines.slice(
              Math.max(0, componentLine.line - 3),
              componentLine.line - 1,
            ),
            matchedLines: [lines[componentLine.line - 1]],
            afterLines: lines.slice(
              componentLine.line,
              Math.min(lines.length, componentLine.line + 3),
            ),
          },
        });
      }

      return matches;
    } catch {
      return [];
    }
  }

  private async extractComponentName(filePath: string): Promise<string | null> {
    try {
      const content = await fs.readFile(filePath, 'utf-8');

      // Look for function/class component declarations
      const patterns = [
        /export\s+default\s+function\s+([A-Z][a-zA-Z0-9]*)/,
        /export\s+function\s+([A-Z][a-zA-Z0-9]*)/,
        /function\s+([A-Z][a-zA-Z0-9]*)/,
        /const\s+([A-Z][a-zA-Z0-9]*)\s*=\s*\(/,
        /class\s+([A-Z][a-zA-Z0-9]*)/,
      ];

      for (const pattern of patterns) {
        const match = content.match(pattern);
        if (match) {
          return match[1];
        }
      }

      // Fallback to filename
      const basename = path.basename(filePath, path.extname(filePath));
      if (basename[0] === basename[0].toUpperCase()) {
        return basename;
      }

      return null;
    } catch {
      return null;
    }
  }

  private findComponentDeclarationLine(
    content: string,
    componentName: string,
  ): { line: number; column: number } {
    const lines = content.split('\n');

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      if (
        line.includes(componentName) &&
        (line.includes('function') ||
          line.includes('const') ||
          line.includes('class'))
      ) {
        return {
          line: i + 1,
          column: line.indexOf(componentName) + 1,
        };
      }
    }

    return { line: 1, column: 1 };
  }

  private calculateMatchScore(
    query: string,
    target: string,
  ): { score: number; type: 'exact' | 'partial' | 'fuzzy' } {
    const queryLower = query.toLowerCase();
    const targetLower = target.toLowerCase();

    if (queryLower === targetLower) {
      return { score: 1.0, type: 'exact' };
    }

    if (targetLower.includes(queryLower)) {
      return { score: 0.8, type: 'partial' };
    }

    // Simple fuzzy matching based on character overlap
    let matches = 0;
    for (let i = 0; i < queryLower.length; i++) {
      if (targetLower.includes(queryLower[i])) {
        matches++;
      }
    }

    const fuzzyScore = matches / queryLower.length;
    if (fuzzyScore > 0.5) {
      return { score: fuzzyScore * 0.6, type: 'fuzzy' };
    }

    return { score: 0, type: 'fuzzy' };
  }

  private isReactComponent(tagName: string): boolean {
    return tagName[0] === tagName[0].toUpperCase();
  }

  private escapeRegex(text: string): string {
    return text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  }
}
