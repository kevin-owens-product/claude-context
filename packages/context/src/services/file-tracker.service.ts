/**
 * File Tracker Service - Tracks file changes between commits
 * @prompt-id forge-v4.1:service:file-tracker:001
 * @generated-at 2026-01-25T00:00:00Z
 * @model claude-opus-4-5
 */

import type { PrismaClient } from '@prisma/client';
import * as path from 'path';
import * as crypto from 'crypto';
import type {
  RepositoryId,
  CodeFileId,
  CodeCommitId,
  GitFileStatus,
  GitCommitInfo,
  FileComplexity,
} from '../types/codebase.types';
import { FileType as FileTypeEnum, FileChangeType as FileChangeTypeEnum } from '@prisma/client';
import { GitSyncService } from './git-sync.service';
import { ImportAnalyzerService } from './import-analyzer.service';

// ============================================================================
// TYPES
// ============================================================================

export interface FileTrackingResult {
  filesAdded: number;
  filesModified: number;
  filesDeleted: number;
  commitsProcessed: number;
  errors: string[];
}

export interface TrackedFile {
  id: CodeFileId;
  path: string;
  contentHash: string;
  lineCount: number;
  byteSize: number;
}

export interface FileStats {
  totalFiles: number;
  totalLines: number;
  byLanguage: Record<string, number>;
  byType: Record<string, number>;
}

// ============================================================================
// CONSTANTS
// ============================================================================

const FILE_TYPE_PATTERNS: Record<FileTypeEnum, RegExp[]> = {
  [FileTypeEnum.SOURCE]: [/\.(ts|tsx|js|jsx|py|go|rs|java|c|cpp|rb|php|swift|kt)$/i],
  [FileTypeEnum.TEST]: [/\.(test|spec)\.(ts|tsx|js|jsx)$/i, /__tests__\//, /\.test\./],
  [FileTypeEnum.CONFIG]: [/\.(json|yaml|yml|toml|ini|env)$/i, /config/, /\.rc$/],
  [FileTypeEnum.DOCUMENTATION]: [/\.(md|mdx|rst|txt|doc)$/i, /README/i, /CHANGELOG/i],
  [FileTypeEnum.GENERATED]: [/\.d\.ts$/i, /generated/, /\.gen\./],
  [FileTypeEnum.ASSET]: [/\.(png|jpg|jpeg|gif|svg|ico|woff|ttf|eot|mp3|mp4)$/i],
  [FileTypeEnum.OTHER]: [],
};

const LANGUAGE_EXTENSIONS: Record<string, string> = {
  ts: 'typescript',
  tsx: 'typescript',
  mts: 'typescript',
  cts: 'typescript',
  js: 'javascript',
  jsx: 'javascript',
  mjs: 'javascript',
  cjs: 'javascript',
  py: 'python',
  go: 'go',
  rs: 'rust',
  java: 'java',
  c: 'c',
  cpp: 'cpp',
  h: 'c',
  hpp: 'cpp',
  rb: 'ruby',
  php: 'php',
  swift: 'swift',
  kt: 'kotlin',
  scala: 'scala',
  cs: 'csharp',
  fs: 'fsharp',
  vb: 'vb',
  json: 'json',
  yaml: 'yaml',
  yml: 'yaml',
  toml: 'toml',
  xml: 'xml',
  html: 'html',
  css: 'css',
  scss: 'scss',
  sass: 'sass',
  less: 'less',
  md: 'markdown',
  sql: 'sql',
  sh: 'shell',
  bash: 'shell',
  zsh: 'shell',
};

// ============================================================================
// SERVICE
// ============================================================================

export class FileTrackerService {
  constructor(
    private readonly prisma: PrismaClient,
    private readonly gitSync: GitSyncService,
    private readonly importAnalyzer: ImportAnalyzerService
  ) {}

  /**
   * Track file changes between two commits
   */
  async trackFileChanges(
    repoId: RepositoryId,
    localPath: string,
    fromSha: string | null,
    toSha: string
  ): Promise<FileTrackingResult> {
    const result: FileTrackingResult = {
      filesAdded: 0,
      filesModified: 0,
      filesDeleted: 0,
      commitsProcessed: 0,
      errors: [],
    };

    // Get commits to process
    const commits = await this.gitSync.getCommits(localPath, {
      from: fromSha || undefined,
      to: toSha,
    });

    // Process in reverse order (oldest first)
    const orderedCommits = commits.reverse();

    for (const commit of orderedCommits) {
      try {
        await this.processCommit(repoId, localPath, commit, result);
        result.commitsProcessed++;
      } catch (error) {
        result.errors.push(
          `Error processing commit ${commit.sha}: ${error instanceof Error ? error.message : String(error)}`
        );
      }
    }

    return result;
  }

  /**
   * Initialize file tracking for a new repository
   */
  async initializeRepository(
    repoId: RepositoryId,
    localPath: string
  ): Promise<FileTrackingResult> {
    const result: FileTrackingResult = {
      filesAdded: 0,
      filesModified: 0,
      filesDeleted: 0,
      commitsProcessed: 0,
      errors: [],
    };

    // Get all files at HEAD
    const files = await this.gitSync.listFilesAtCommit(localPath);
    const headCommit = await this.gitSync.getHeadCommit(localPath);

    // Process files in batches
    const BATCH_SIZE = 100;
    for (let i = 0; i < files.length; i += BATCH_SIZE) {
      const batch = files.slice(i, i + BATCH_SIZE);

      await Promise.all(
        batch.map(async (file) => {
          try {
            await this.createFileRecord(repoId, localPath, file.path, headCommit);
            result.filesAdded++;
          } catch (error) {
            result.errors.push(
              `Error creating file ${file.path}: ${error instanceof Error ? error.message : String(error)}`
            );
          }
        })
      );
    }

    return result;
  }

  /**
   * Update file records based on changes
   */
  async updateFileRecords(
    repoId: RepositoryId,
    localPath: string,
    changes: Array<{
      path: string;
      changeType: FileChangeTypeEnum;
      oldPath?: string;
    }>,
    commitSha: string
  ): Promise<void> {
    for (const change of changes) {
      switch (change.changeType) {
        case FileChangeTypeEnum.ADDED:
          await this.createFileRecord(repoId, localPath, change.path, commitSha);
          break;

        case FileChangeTypeEnum.MODIFIED:
          await this.updateFileRecord(repoId, localPath, change.path, commitSha);
          break;

        case FileChangeTypeEnum.DELETED:
          await this.markFileDeleted(repoId, change.path, commitSha);
          break;

        case FileChangeTypeEnum.RENAMED:
          await this.handleFileRename(
            repoId,
            localPath,
            change.oldPath!,
            change.path,
            commitSha
          );
          break;

        case FileChangeTypeEnum.COPIED:
          await this.createFileRecord(repoId, localPath, change.path, commitSha);
          break;
      }
    }
  }

  /**
   * Compute file statistics for a repository
   */
  async computeFileStats(repoId: RepositoryId): Promise<FileStats> {
    const files = await this.prisma.codeFile.findMany({
      where: {
        repositoryId: repoId,
        deletedAt: null,
      },
      select: {
        lineCount: true,
        language: true,
        fileType: true,
      },
    });

    const stats: FileStats = {
      totalFiles: files.length,
      totalLines: 0,
      byLanguage: {},
      byType: {},
    };

    for (const file of files) {
      stats.totalLines += file.lineCount;

      if (file.language) {
        stats.byLanguage[file.language] =
          (stats.byLanguage[file.language] || 0) + file.lineCount;
      }

      stats.byType[file.fileType] = (stats.byType[file.fileType] || 0) + 1;
    }

    return stats;
  }

  /**
   * Update change frequency for all files in a repository
   */
  async updateChangeFrequencies(repoId: RepositoryId): Promise<void> {
    // Calculate changes per week for each file
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    // Get file change counts
    const changeCounts = await this.prisma.fileChange.groupBy({
      by: ['fileId'],
      where: {
        commit: {
          repositoryId: repoId,
          committedAt: {
            gte: thirtyDaysAgo,
          },
        },
        fileId: { not: null },
      },
      _count: {
        id: true,
      },
    });

    // Update each file's change frequency (changes per week)
    for (const { fileId, _count } of changeCounts) {
      if (!fileId) continue;

      const changesPerWeek = (_count.id / 30) * 7;

      await this.prisma.codeFile.update({
        where: { id: fileId },
        data: { changeFrequency: changesPerWeek },
      });
    }
  }

  /**
   * Analyze imports for all files in a repository
   */
  async analyzeImportsForRepository(
    repoId: RepositoryId,
    localPath: string
  ): Promise<{ processed: number; errors: string[] }> {
    const files = await this.prisma.codeFile.findMany({
      where: {
        repositoryId: repoId,
        deletedAt: null,
        extension: { in: ['ts', 'tsx', 'js', 'jsx', 'mjs', 'cjs'] },
      },
    });

    const errors: string[] = [];
    let processed = 0;

    // Delete existing imports for this repo
    await this.prisma.fileImport.deleteMany({
      where: { repositoryId: repoId },
    });

    // Create file path map for resolution
    const fileMap = new Map(files.map((f) => [f.path, f.id]));

    for (const file of files) {
      try {
        const content = await this.gitSync.getFileContent(localPath, file.path);
        const analysis = this.importAnalyzer.analyzeFile(content, file.path);

        const allImports = [...analysis.imports, ...analysis.reexports];

        for (const imp of allImports) {
          const isExternal = this.importAnalyzer.isExternalImport(imp.importPath);
          let targetFileId: string | null = null;

          if (!isExternal) {
            // Try to resolve the import
            const resolvedPath = this.resolveImportPath(file.path, imp.importPath);
            targetFileId = fileMap.get(resolvedPath) || null;
          }

          await this.prisma.fileImport.create({
            data: {
              repositoryId: repoId,
              sourceFileId: file.id,
              targetFileId,
              importPath: imp.importPath,
              importType: imp.importType,
              isResolved: targetFileId !== null || isExternal,
              isExternal,
              importedSymbols: imp.importedSymbols,
            },
          });
        }

        processed++;
      } catch (error) {
        errors.push(
          `Error analyzing ${file.path}: ${error instanceof Error ? error.message : String(error)}`
        );
      }
    }

    return { processed, errors };
  }

  // ============================================================================
  // PRIVATE METHODS
  // ============================================================================

  private async processCommit(
    repoId: RepositoryId,
    localPath: string,
    commit: GitCommitInfo,
    result: FileTrackingResult
  ): Promise<void> {
    // Create commit record
    const commitRecord = await this.prisma.codeCommit.upsert({
      where: {
        repositoryId_sha: {
          repositoryId: repoId,
          sha: commit.sha,
        },
      },
      create: {
        repositoryId: repoId,
        sha: commit.sha,
        shortSha: commit.shortSha,
        message: commit.message,
        authorName: commit.authorName,
        authorEmail: commit.authorEmail,
        authoredAt: commit.authoredAt,
        committerName: commit.committerName,
        committerEmail: commit.committerEmail,
        committedAt: commit.committedAt,
        parentShas: commit.parentShas,
        isMerge: commit.parentShas.length > 1,
      },
      update: {},
    });

    // Get diff for this commit
    const diff = await this.gitSync.getCommitDiff(localPath, commit.sha);

    // Update commit stats
    await this.prisma.codeCommit.update({
      where: { id: commitRecord.id },
      data: {
        filesChanged: diff.stats.filesChanged,
        insertions: diff.stats.insertions,
        deletions: diff.stats.deletions,
      },
    });

    // Process file changes
    for (const file of diff.files) {
      const changeType = this.mapStatusToChangeType(file.status);

      // Get or create file record
      let fileRecord = await this.prisma.codeFile.findFirst({
        where: {
          repositoryId: repoId,
          path: file.path,
        },
      });

      if (changeType === 'ADDED' && !fileRecord) {
        await this.createFileRecord(repoId, localPath, file.path, commit.sha);
        fileRecord = await this.prisma.codeFile.findFirst({
          where: { repositoryId: repoId, path: file.path },
        });
        result.filesAdded++;
      } else if (changeType === 'MODIFIED' && fileRecord) {
        await this.updateFileRecord(repoId, localPath, file.path, commit.sha);
        result.filesModified++;
      } else if (changeType === 'DELETED' && fileRecord) {
        await this.markFileDeleted(repoId, file.path, commit.sha);
        result.filesDeleted++;
      }

      // Create file change record
      await this.prisma.fileChange.create({
        data: {
          commitId: commitRecord.id,
          fileId: fileRecord?.id,
          changeType,
          oldPath: file.oldPath,
          newPath: file.path,
          insertions: file.insertions,
          deletions: file.deletions,
        },
      });
    }
  }

  private async createFileRecord(
    repoId: RepositoryId,
    localPath: string,
    filePath: string,
    commitSha: string
  ): Promise<void> {
    // Get file content and metadata
    let content = '';
    try {
      content = await this.gitSync.getFileContent(localPath, filePath, commitSha);
    } catch {
      // File might be binary or unreadable
    }

    const ext = path.extname(filePath).replace('.', '').toLowerCase();
    const name = path.basename(filePath);
    const language = this.detectLanguage(filePath, ext);
    const fileType = this.detectFileType(filePath);
    const contentHash = this.hashContent(content);
    const lineCount = content ? content.split('\n').length : 0;
    const byteSize = Buffer.byteLength(content, 'utf8');

    await this.prisma.codeFile.create({
      data: {
        repositoryId: repoId,
        path: filePath,
        name,
        extension: ext || null,
        language,
        fileType,
        contentHash,
        lineCount,
        byteSize,
        lastModifiedCommit: commitSha,
        lastModifiedAt: new Date(),
        complexity: {},
      },
    });
  }

  private async updateFileRecord(
    repoId: RepositoryId,
    localPath: string,
    filePath: string,
    commitSha: string
  ): Promise<void> {
    let content = '';
    try {
      content = await this.gitSync.getFileContent(localPath, filePath, commitSha);
    } catch {
      // File might be binary
    }

    const contentHash = this.hashContent(content);
    const lineCount = content ? content.split('\n').length : 0;
    const byteSize = Buffer.byteLength(content, 'utf8');

    await this.prisma.codeFile.updateMany({
      where: {
        repositoryId: repoId,
        path: filePath,
      },
      data: {
        contentHash,
        lineCount,
        byteSize,
        lastModifiedCommit: commitSha,
        lastModifiedAt: new Date(),
      },
    });
  }

  private async markFileDeleted(
    repoId: RepositoryId,
    filePath: string,
    commitSha: string
  ): Promise<void> {
    await this.prisma.codeFile.updateMany({
      where: {
        repositoryId: repoId,
        path: filePath,
      },
      data: {
        deletedAt: new Date(),
        deletedInCommit: commitSha,
      },
    });
  }

  private async handleFileRename(
    repoId: RepositoryId,
    localPath: string,
    oldPath: string,
    newPath: string,
    commitSha: string
  ): Promise<void> {
    // Update the file's path
    let content = '';
    try {
      content = await this.gitSync.getFileContent(localPath, newPath, commitSha);
    } catch {
      // File might be binary
    }

    const ext = path.extname(newPath).replace('.', '').toLowerCase();
    const name = path.basename(newPath);
    const contentHash = this.hashContent(content);
    const lineCount = content ? content.split('\n').length : 0;
    const byteSize = Buffer.byteLength(content, 'utf8');

    await this.prisma.codeFile.updateMany({
      where: {
        repositoryId: repoId,
        path: oldPath,
      },
      data: {
        path: newPath,
        name,
        extension: ext || null,
        contentHash,
        lineCount,
        byteSize,
        lastModifiedCommit: commitSha,
        lastModifiedAt: new Date(),
      },
    });
  }

  private mapStatusToChangeType(status: GitFileStatus['status']): FileChangeTypeEnum {
    switch (status) {
      case 'A':
        return FileChangeTypeEnum.ADDED;
      case 'M':
        return FileChangeTypeEnum.MODIFIED;
      case 'D':
        return FileChangeTypeEnum.DELETED;
      case 'R':
        return FileChangeTypeEnum.RENAMED;
      case 'C':
        return FileChangeTypeEnum.COPIED;
      default:
        return FileChangeTypeEnum.MODIFIED;
    }
  }

  private detectLanguage(filePath: string, ext: string): string | null {
    return LANGUAGE_EXTENSIONS[ext] || null;
  }

  private detectFileType(filePath: string): FileTypeEnum {
    for (const [type, patterns] of Object.entries(FILE_TYPE_PATTERNS)) {
      for (const pattern of patterns) {
        if (pattern.test(filePath)) {
          return type as FileTypeEnum;
        }
      }
    }
    return FileTypeEnum.OTHER;
  }

  private hashContent(content: string): string {
    return crypto.createHash('sha256').update(content).digest('hex');
  }

  private resolveImportPath(fromPath: string, importPath: string): string {
    if (importPath.startsWith('.')) {
      const dir = path.dirname(fromPath);
      let resolved = path.join(dir, importPath);

      // Try common extensions
      const extensions = ['.ts', '.tsx', '.js', '.jsx', '/index.ts', '/index.tsx', '/index.js'];
      for (const ext of extensions) {
        if (!resolved.includes('.')) {
          return resolved + ext;
        }
      }

      return resolved;
    }

    // Non-relative imports handled elsewhere
    return importPath;
  }
}
