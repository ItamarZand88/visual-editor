import * as fs from 'node:fs/promises';
import * as path from 'node:path';

export class FileSystemService {
  public async findFiles(
    rootPath: string,
    includePatterns: string[],
    excludePatterns: string[] = [],
  ): Promise<string[]> {
    const results: string[] = [];

    const processDirectory = async (
      dirPath: string,
      depth = 0,
    ): Promise<void> => {
      if (depth > 10) return; // Prevent infinite recursion

      try {
        const entries = await fs.readdir(dirPath, { withFileTypes: true });

        for (const entry of entries) {
          const fullPath = path.join(dirPath, entry.name);
          const relativePath = path.relative(rootPath, fullPath);

          // Check if should be excluded
          const shouldExclude = excludePatterns.some(
            (pattern) =>
              this.matchesPattern(relativePath, pattern) ||
              this.matchesPattern(entry.name, pattern),
          );

          if (shouldExclude) {
            continue;
          }

          if (entry.isFile()) {
            // Check if file matches include patterns
            const shouldInclude = includePatterns.some(
              (pattern) =>
                this.matchesPattern(relativePath, pattern) ||
                this.matchesPattern(entry.name, pattern),
            );

            if (shouldInclude) {
              results.push(fullPath);
            }
          } else if (entry.isDirectory()) {
            await processDirectory(fullPath, depth + 1);
          }
        }
      } catch (error) {
        console.warn(
          `[FileSystemService] Cannot read directory: ${dirPath}`,
          error,
        );
      }
    };

    await processDirectory(rootPath);
    return results;
  }

  private matchesPattern(filename: string, pattern: string): boolean {
    // Simple glob-like pattern matching
    if (pattern.includes('**')) {
      // Handle recursive patterns like **/*.ts
      const regexPattern = pattern
        .replace(/\*\*/g, '.*')
        .replace(/\*/g, '[^/]*')
        .replace(/\./g, '\\.');

      const regex = new RegExp(`^${regexPattern}$`);
      return regex.test(filename);
    } else if (pattern.includes('*')) {
      // Handle simple wildcards like *.ts
      const regexPattern = pattern.replace(/\*/g, '.*').replace(/\./g, '\\.');

      const regex = new RegExp(`^${regexPattern}$`);
      return regex.test(filename);
    } else {
      // Exact match or contains
      return filename === pattern || filename.includes(pattern);
    }
  }
}
