/**
 * Import Analyzer Service - Extracts import statements from source code
 * @prompt-id forge-v4.1:service:import-analyzer:001
 * @generated-at 2026-01-25T00:00:00Z
 * @model claude-opus-4-5
 */

import * as path from 'path';
import type {
  ImportType,
  ParsedImport,
  ImportAnalysisResult,
  ResolvedImport,
  CodeFileId,
  RepositoryId,
} from '../types/codebase.types';

// ============================================================================
// TYPES
// ============================================================================

export interface FileResolver {
  resolveImportPath(
    fromPath: string,
    importPath: string
  ): Promise<{ fileId: CodeFileId; path: string } | null>;
}

export interface LanguageParser {
  language: string;
  extensions: string[];
  parse(content: string, filePath: string): ImportAnalysisResult;
}

// ============================================================================
// SERVICE
// ============================================================================

export class ImportAnalyzerService {
  private parsers: Map<string, LanguageParser> = new Map();

  constructor() {
    // Register default parsers
    this.registerParser(new TypeScriptParser());
    this.registerParser(new JavaScriptParser());
    this.registerParser(new CSSParser());
  }

  /**
   * Register a language parser
   */
  registerParser(parser: LanguageParser): void {
    for (const ext of parser.extensions) {
      this.parsers.set(ext.toLowerCase(), parser);
    }
  }

  /**
   * Get parser for a file extension
   */
  getParser(extension: string): LanguageParser | undefined {
    return this.parsers.get(extension.toLowerCase().replace(/^\./, ''));
  }

  /**
   * Detect language from file extension
   */
  detectLanguage(filePath: string): string | null {
    const ext = path.extname(filePath).toLowerCase().replace(/^\./, '');
    const parser = this.parsers.get(ext);
    return parser?.language || null;
  }

  /**
   * Analyze imports in a file
   */
  analyzeFile(content: string, filePath: string): ImportAnalysisResult {
    const ext = path.extname(filePath).toLowerCase().replace(/^\./, '');
    const parser = this.parsers.get(ext);

    if (!parser) {
      return {
        imports: [],
        reexports: [],
        language: 'unknown',
      };
    }

    return parser.parse(content, filePath);
  }

  /**
   * Resolve imports to actual files
   */
  async resolveImports(
    repoId: RepositoryId,
    fromPath: string,
    imports: ParsedImport[],
    resolver: FileResolver
  ): Promise<ResolvedImport[]> {
    const resolved: ResolvedImport[] = [];

    for (const imp of imports) {
      const isExternal = this.isExternalImport(imp.importPath);

      if (isExternal) {
        resolved.push({
          ...imp,
          isResolved: true,
          isExternal: true,
        });
        continue;
      }

      // Try to resolve relative/absolute imports
      const result = await resolver.resolveImportPath(fromPath, imp.importPath);

      if (result) {
        resolved.push({
          ...imp,
          isResolved: true,
          isExternal: false,
          resolvedPath: result.path,
          resolvedFileId: result.fileId,
        });
      } else {
        resolved.push({
          ...imp,
          isResolved: false,
          isExternal: false,
        });
      }
    }

    return resolved;
  }

  /**
   * Build dependency graph from a starting file
   */
  async buildDependencyGraph(
    repoId: RepositoryId,
    startFileId: CodeFileId,
    depth: number,
    getFileContent: (fileId: CodeFileId) => Promise<{ path: string; content: string } | null>,
    resolver: FileResolver
  ): Promise<{
    nodes: Map<CodeFileId, string>;
    edges: Array<{ from: CodeFileId; to: CodeFileId; importPath: string }>;
    external: Set<string>;
  }> {
    const nodes = new Map<CodeFileId, string>();
    const edges: Array<{ from: CodeFileId; to: CodeFileId; importPath: string }> = [];
    const external = new Set<string>();
    const visited = new Set<string>();
    const queue: Array<{ fileId: CodeFileId; currentDepth: number }> = [];

    queue.push({ fileId: startFileId, currentDepth: 0 });

    while (queue.length > 0) {
      const current = queue.shift()!;

      if (visited.has(current.fileId) || current.currentDepth > depth) {
        continue;
      }

      visited.add(current.fileId);

      const file = await getFileContent(current.fileId);
      if (!file) continue;

      nodes.set(current.fileId, file.path);

      const analysis = this.analyzeFile(file.content, file.path);
      const allImports = [...analysis.imports, ...analysis.reexports];
      const resolved = await this.resolveImports(repoId, file.path, allImports, resolver);

      for (const imp of resolved) {
        if (imp.isExternal) {
          // Extract package name from external import
          const pkgName = this.extractPackageName(imp.importPath);
          external.add(pkgName);
        } else if (imp.isResolved && imp.resolvedFileId) {
          edges.push({
            from: current.fileId,
            to: imp.resolvedFileId,
            importPath: imp.importPath,
          });

          if (!visited.has(imp.resolvedFileId)) {
            queue.push({
              fileId: imp.resolvedFileId,
              currentDepth: current.currentDepth + 1,
            });
          }
        }
      }
    }

    return { nodes, edges, external };
  }

  /**
   * Check if an import path is external (npm package, etc.)
   */
  isExternalImport(importPath: string): boolean {
    // Relative imports
    if (importPath.startsWith('.') || importPath.startsWith('/')) {
      return false;
    }

    // Absolute imports with common aliases
    if (importPath.startsWith('@/') || importPath.startsWith('~/') || importPath.startsWith('src/')) {
      return false;
    }

    // Scoped packages (@org/pkg) and regular packages
    return true;
  }

  /**
   * Extract package name from import path
   */
  extractPackageName(importPath: string): string {
    // Handle scoped packages: @scope/package/path -> @scope/package
    if (importPath.startsWith('@')) {
      const parts = importPath.split('/');
      return parts.length >= 2 ? `${parts[0]}/${parts[1]}` : importPath;
    }

    // Regular packages: package/path -> package
    const parts = importPath.split('/');
    return parts[0];
  }
}

// ============================================================================
// LANGUAGE PARSERS
// ============================================================================

/**
 * TypeScript/TSX parser
 */
class TypeScriptParser implements LanguageParser {
  language = 'typescript';
  extensions = ['ts', 'tsx', 'mts', 'cts'];

  // Regex patterns for TypeScript imports
  private patterns = {
    // import x from 'y'
    // import { x } from 'y'
    // import * as x from 'y'
    esImport: /^import\s+(?:type\s+)?(?:(\*\s+as\s+\w+|\{[^}]*\}|\w+)\s*,?\s*)*(?:from\s+)?['"](\.{1,2}\/[^'"]+|[^'"]+)['"]/gm,

    // import type { X } from 'y'
    typeImport: /^import\s+type\s+(?:\{[^}]*\}|\*\s+as\s+\w+)\s+from\s+['"](\.{1,2}\/[^'"]+|[^'"]+)['"]/gm,

    // import('x')
    dynamicImport: /import\s*\(\s*['"](\.{1,2}\/[^'"]+|[^'"]+)['"]\s*\)/g,

    // export * from 'y'
    // export { x } from 'y'
    reexport: /^export\s+(?:\*|\{[^}]*\})\s+from\s+['"](\.{1,2}\/[^'"]+|[^'"]+)['"]/gm,

    // require('y')
    commonjs: /require\s*\(\s*['"](\.{1,2}\/[^'"]+|[^'"]+)['"]\s*\)/g,
  };

  parse(content: string, _filePath: string): ImportAnalysisResult {
    const imports: ParsedImport[] = [];
    const reexports: ParsedImport[] = [];
    const lines = content.split('\n');

    // Process line by line to get line numbers
    let lineNumber = 0;
    for (const line of lines) {
      lineNumber++;

      // Type imports
      const typeMatches = line.matchAll(/^import\s+type\s+(\{[^}]*\}|\*\s+as\s+\w+)\s+from\s+['"]([^'"]+)['"]/g);
      for (const match of typeMatches) {
        imports.push({
          importPath: match[2],
          importType: 'TYPESCRIPT_TYPE' as ImportType,
          importedSymbols: this.extractSymbols(match[1]),
          isTypeOnly: true,
          line: lineNumber,
        });
      }

      // Regular ES imports
      const esMatches = line.matchAll(/^import\s+(?!type\s)(.+?)\s+from\s+['"]([^'"]+)['"]/g);
      for (const match of esMatches) {
        imports.push({
          importPath: match[2],
          importType: 'ES_IMPORT' as ImportType,
          importedSymbols: this.extractSymbols(match[1]),
          isTypeOnly: false,
          line: lineNumber,
        });
      }

      // Side-effect imports: import 'x'
      const sideEffectMatches = line.matchAll(/^import\s+['"]([^'"]+)['"]/g);
      for (const match of sideEffectMatches) {
        imports.push({
          importPath: match[1],
          importType: 'ES_IMPORT' as ImportType,
          importedSymbols: [],
          isTypeOnly: false,
          line: lineNumber,
        });
      }

      // Re-exports
      const reexportMatches = line.matchAll(/^export\s+(\*|\{[^}]*\})\s+from\s+['"]([^'"]+)['"]/g);
      for (const match of reexportMatches) {
        reexports.push({
          importPath: match[2],
          importType: 'ES_REEXPORT' as ImportType,
          importedSymbols: match[1] === '*' ? ['*'] : this.extractSymbols(match[1]),
          isTypeOnly: false,
          line: lineNumber,
        });
      }

      // CommonJS require
      const cjsMatches = line.matchAll(/(?:const|let|var)\s+(\{[^}]*\}|\w+)\s*=\s*require\s*\(\s*['"]([^'"]+)['"]\s*\)/g);
      for (const match of cjsMatches) {
        imports.push({
          importPath: match[2],
          importType: 'COMMONJS' as ImportType,
          importedSymbols: this.extractSymbols(match[1]),
          isTypeOnly: false,
          line: lineNumber,
        });
      }
    }

    // Dynamic imports (can span multiple lines, so use full content)
    const dynamicMatches = content.matchAll(/import\s*\(\s*['"]([^'"]+)['"]\s*\)/g);
    for (const match of dynamicMatches) {
      const lineNum = this.getLineNumber(content, match.index || 0);
      imports.push({
        importPath: match[1],
        importType: 'ES_DYNAMIC' as ImportType,
        importedSymbols: [],
        isTypeOnly: false,
        line: lineNum,
      });
    }

    return {
      imports,
      reexports,
      language: this.language,
    };
  }

  private extractSymbols(clause: string): string[] {
    if (!clause) return [];

    // Handle: * as name
    if (clause.includes('*')) {
      const match = clause.match(/\*\s+as\s+(\w+)/);
      return match ? [match[1]] : ['*'];
    }

    // Handle: { a, b as c, d }
    if (clause.includes('{')) {
      const inner = clause.replace(/[{}]/g, '').trim();
      return inner
        .split(',')
        .map((s) => s.trim())
        .filter(Boolean)
        .map((s) => {
          // Handle "foo as bar" -> take "foo"
          const parts = s.split(/\s+as\s+/);
          return parts[0].replace(/^type\s+/, '').trim();
        });
    }

    // Handle: default import
    const trimmed = clause.trim();
    if (trimmed && !trimmed.includes(' ')) {
      return ['default'];
    }

    return [];
  }

  private getLineNumber(content: string, index: number): number {
    return content.substring(0, index).split('\n').length;
  }
}

/**
 * JavaScript/JSX parser (extends TypeScript but with JS language)
 */
class JavaScriptParser extends TypeScriptParser {
  language = 'javascript';
  extensions = ['js', 'jsx', 'mjs', 'cjs'];
}

/**
 * CSS/SCSS parser
 */
class CSSParser implements LanguageParser {
  language = 'css';
  extensions = ['css', 'scss', 'sass', 'less'];

  parse(content: string, _filePath: string): ImportAnalysisResult {
    const imports: ParsedImport[] = [];
    const lines = content.split('\n');

    let lineNumber = 0;
    for (const line of lines) {
      lineNumber++;

      // @import url('x') or @import 'x'
      const importMatches = line.matchAll(/@import\s+(?:url\s*\(\s*)?['"]([^'"]+)['"]\s*\)?/g);
      for (const match of importMatches) {
        imports.push({
          importPath: match[1],
          importType: 'CSS_IMPORT' as ImportType,
          importedSymbols: [],
          isTypeOnly: false,
          line: lineNumber,
        });
      }

      // @use 'x' (SCSS)
      const useMatches = line.matchAll(/@use\s+['"]([^'"]+)['"]/g);
      for (const match of useMatches) {
        imports.push({
          importPath: match[1],
          importType: 'SCSS_IMPORT' as ImportType,
          importedSymbols: [],
          isTypeOnly: false,
          line: lineNumber,
        });
      }

      // @forward 'x' (SCSS)
      const forwardMatches = line.matchAll(/@forward\s+['"]([^'"]+)['"]/g);
      for (const match of forwardMatches) {
        imports.push({
          importPath: match[1],
          importType: 'SCSS_IMPORT' as ImportType,
          importedSymbols: [],
          isTypeOnly: false,
          line: lineNumber,
        });
      }
    }

    return {
      imports,
      reexports: [],
      language: this.language,
    };
  }
}
