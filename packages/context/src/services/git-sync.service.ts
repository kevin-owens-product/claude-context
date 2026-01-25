/**
 * Git Sync Service - Handles git operations for codebase observation
 * @prompt-id forge-v4.1:service:git-sync:001
 * @generated-at 2026-01-25T00:00:00Z
 * @model claude-opus-4-5
 */

import simpleGit, { SimpleGit, LogResult, DiffResult } from 'simple-git';
import * as fs from 'fs';
import * as path from 'path';
import type {
  GitCloneOptions,
  GitFetchOptions,
  GitCommitInfo,
  GitFileStatus,
  GitDiff,
  RepoAuthType,
} from '../types/codebase.types';

// ============================================================================
// TYPES
// ============================================================================

export interface GitAuthConfig {
  type: RepoAuthType;
  token?: string;
  sshKey?: string;
  sshKeyPath?: string;
  username?: string;
  password?: string;
}

export interface GitRepoInfo {
  currentBranch: string;
  branches: string[];
  remotes: Array<{ name: string; url: string }>;
  headCommit: string;
}

export interface GitFileTree {
  path: string;
  type: 'file' | 'directory';
  sha?: string;
}

// ============================================================================
// SERVICE
// ============================================================================

export class GitSyncService {
  private readonly baseRepoPath: string;

  constructor(baseRepoPath: string = '/data/repos') {
    this.baseRepoPath = baseRepoPath;
  }

  /**
   * Build the local path for a repository
   */
  getRepoLocalPath(tenantId: string, repoId: string): string {
    return path.join(this.baseRepoPath, tenantId, repoId);
  }

  /**
   * Clone a repository to local filesystem
   */
  async cloneRepository(
    url: string,
    localPath: string,
    auth?: GitAuthConfig,
    options?: GitCloneOptions
  ): Promise<void> {
    // Ensure parent directory exists
    const parentDir = path.dirname(localPath);
    await fs.promises.mkdir(parentDir, { recursive: true });

    // Build authenticated URL if needed
    const cloneUrl = this.buildAuthenticatedUrl(url, auth);

    const git = simpleGit();
    const cloneOptions: string[] = [];

    if (options?.depth) {
      cloneOptions.push('--depth', options.depth.toString());
    }
    if (options?.singleBranch) {
      cloneOptions.push('--single-branch');
    }
    if (options?.branch) {
      cloneOptions.push('--branch', options.branch);
    }

    await git.clone(cloneUrl, localPath, cloneOptions);
  }

  /**
   * Fetch updates from remote
   */
  async fetchUpdates(
    localPath: string,
    auth?: GitAuthConfig,
    options?: GitFetchOptions
  ): Promise<void> {
    const git = this.getGit(localPath);
    const fetchOptions: string[] = [];

    if (options?.prune) {
      fetchOptions.push('--prune');
    }
    if (options?.tags) {
      fetchOptions.push('--tags');
    }

    // Set up auth if needed
    if (auth?.token) {
      await this.configureAuth(git, auth);
    }

    await git.fetch(['origin', ...fetchOptions]);
  }

  /**
   * Get repository info (branches, current branch, remotes)
   */
  async getRepoInfo(localPath: string): Promise<GitRepoInfo> {
    const git = this.getGit(localPath);

    const [branchSummary, remoteSummary, headRef] = await Promise.all([
      git.branch(['-a']),
      git.remote(['-v']),
      git.revparse(['HEAD']),
    ]);

    // Parse remotes
    const remotes: Array<{ name: string; url: string }> = [];
    if (remoteSummary) {
      const lines = remoteSummary.split('\n').filter(Boolean);
      const seen = new Set<string>();
      for (const line of lines) {
        const [name, url] = line.split(/\s+/);
        if (name && url && !seen.has(name)) {
          seen.add(name);
          remotes.push({ name, url });
        }
      }
    }

    return {
      currentBranch: branchSummary.current,
      branches: branchSummary.all,
      remotes,
      headCommit: headRef.trim(),
    };
  }

  /**
   * List all branches (local and remote)
   */
  async listBranches(localPath: string): Promise<string[]> {
    const git = this.getGit(localPath);
    const branchSummary = await git.branch(['-a']);
    return branchSummary.all;
  }

  /**
   * Get commits between two refs (or last N commits)
   */
  async getCommits(
    localPath: string,
    options?: {
      from?: string;
      to?: string;
      limit?: number;
      branch?: string;
    }
  ): Promise<GitCommitInfo[]> {
    const git = this.getGit(localPath);

    const logOptions: string[] = [];

    if (options?.from && options?.to) {
      logOptions.push(`${options.from}..${options.to}`);
    } else if (options?.branch) {
      logOptions.push(options.branch);
    }

    if (options?.limit) {
      logOptions.push(`-n`, options.limit.toString());
    }

    const log: LogResult = await git.log(logOptions);

    return log.all.map((commit) => ({
      sha: commit.hash,
      shortSha: commit.hash.substring(0, 7),
      message: commit.message,
      authorName: commit.author_name,
      authorEmail: commit.author_email,
      authoredAt: new Date(commit.date),
      committerName: commit.author_name, // simple-git doesn't expose committer separately
      committerEmail: commit.author_email,
      committedAt: new Date(commit.date),
      parentShas: commit.refs ? [] : [], // Would need additional parsing
    }));
  }

  /**
   * Get diff for a specific commit
   */
  async getCommitDiff(localPath: string, sha: string): Promise<GitDiff> {
    const git = this.getGit(localPath);

    // Get commit info
    const log = await git.log(['-1', sha]);
    if (!log.latest) {
      throw new Error(`Commit not found: ${sha}`);
    }

    const commit = log.latest;

    // Get diff stats
    const diffSummary: DiffResult = await git.diffSummary([`${sha}^..${sha}`]).catch(() => ({
      changed: 0,
      insertions: 0,
      deletions: 0,
      files: [],
    }));

    const files: GitFileStatus[] = diffSummary.files.map((file) => ({
      path: file.file,
      status: this.parseFileStatus(file),
      insertions: 'insertions' in file ? (file.insertions || 0) : 0,
      deletions: 'deletions' in file ? (file.deletions || 0) : 0,
    }));

    return {
      commit: {
        sha: commit.hash,
        shortSha: commit.hash.substring(0, 7),
        message: commit.message,
        authorName: commit.author_name,
        authorEmail: commit.author_email,
        authoredAt: new Date(commit.date),
        committerName: commit.author_name,
        committerEmail: commit.author_email,
        committedAt: new Date(commit.date),
        parentShas: [],
      },
      files,
      stats: {
        filesChanged: diffSummary.changed,
        insertions: diffSummary.insertions,
        deletions: diffSummary.deletions,
      },
    };
  }

  /**
   * List files at a specific commit (or HEAD)
   */
  async listFilesAtCommit(
    localPath: string,
    sha?: string
  ): Promise<GitFileTree[]> {
    const git = this.getGit(localPath);
    const ref = sha || 'HEAD';

    // Use ls-tree to get all files
    const result = await git.raw(['ls-tree', '-r', '--name-only', ref]);
    const files = result.trim().split('\n').filter(Boolean);

    return files.map((filePath) => ({
      path: filePath,
      type: 'file' as const,
    }));
  }

  /**
   * Get file content at a specific commit
   */
  async getFileContent(
    localPath: string,
    filePath: string,
    sha?: string
  ): Promise<string> {
    const git = this.getGit(localPath);
    const ref = sha || 'HEAD';

    return git.show([`${ref}:${filePath}`]);
  }

  /**
   * Get file hash (blob SHA) at a specific commit
   */
  async getFileHash(
    localPath: string,
    filePath: string,
    sha?: string
  ): Promise<string | null> {
    const git = this.getGit(localPath);
    const ref = sha || 'HEAD';

    try {
      const result = await git.raw(['ls-tree', ref, filePath]);
      if (!result) return null;

      // Format: <mode> <type> <sha>\t<path>
      const match = result.match(/^\d+\s+\w+\s+([a-f0-9]+)/);
      return match ? match[1] : null;
    } catch {
      return null;
    }
  }

  /**
   * Get changes between two commits
   */
  async getChangesBetween(
    localPath: string,
    fromSha: string,
    toSha: string
  ): Promise<GitFileStatus[]> {
    const git = this.getGit(localPath);

    const diffSummary = await git.diffSummary([`${fromSha}..${toSha}`]);

    return diffSummary.files.map((file) => ({
      path: file.file,
      status: this.parseFileStatus(file),
      insertions: 'insertions' in file ? (file.insertions || 0) : 0,
      deletions: 'deletions' in file ? (file.deletions || 0) : 0,
    }));
  }

  /**
   * Pull latest changes from remote
   */
  async pull(localPath: string, branch?: string): Promise<void> {
    const git = this.getGit(localPath);
    await git.pull('origin', branch);
  }

  /**
   * Check if a path exists in the repository at a given commit
   */
  async pathExists(
    localPath: string,
    filePath: string,
    sha?: string
  ): Promise<boolean> {
    const git = this.getGit(localPath);
    const ref = sha || 'HEAD';

    try {
      await git.raw(['ls-tree', ref, filePath]);
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Get commit count for a file (change frequency)
   */
  async getFileCommitCount(
    localPath: string,
    filePath: string,
    since?: Date
  ): Promise<number> {
    const git = this.getGit(localPath);
    const options: string[] = ['--oneline', '--', filePath];

    if (since) {
      options.unshift(`--since=${since.toISOString()}`);
    }

    const log = await git.log(options);
    return log.total;
  }

  /**
   * Get unique authors for a file
   */
  async getFileAuthors(localPath: string, filePath: string): Promise<string[]> {
    const git = this.getGit(localPath);

    const result = await git.raw([
      'log',
      '--format=%ae',
      '--',
      filePath,
    ]);

    const emails = result.trim().split('\n').filter(Boolean);
    return [...new Set(emails)];
  }

  /**
   * Check if directory is a valid git repository
   */
  async isGitRepository(localPath: string): Promise<boolean> {
    try {
      const git = this.getGit(localPath);
      await git.revparse(['--git-dir']);
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Get the current HEAD commit SHA
   */
  async getHeadCommit(localPath: string): Promise<string> {
    const git = this.getGit(localPath);
    const result = await git.revparse(['HEAD']);
    return result.trim();
  }

  /**
   * Delete a local repository
   */
  async deleteRepository(localPath: string): Promise<void> {
    await fs.promises.rm(localPath, { recursive: true, force: true });
  }

  // ============================================================================
  // PRIVATE METHODS
  // ============================================================================

  private getGit(localPath: string): SimpleGit {
    return simpleGit(localPath);
  }

  private buildAuthenticatedUrl(url: string, auth?: GitAuthConfig): string {
    if (!auth || auth.type === 'NONE') {
      return url;
    }

    if (auth.type === 'PAT' && auth.token) {
      // For HTTPS URLs, inject token
      if (url.startsWith('https://')) {
        const urlObj = new URL(url);
        urlObj.username = auth.token;
        urlObj.password = 'x-oauth-basic';
        return urlObj.toString();
      }
    }

    if (auth.type === 'SSH_KEY') {
      // SSH URLs are handled by the system's SSH config
      // The key should be configured in ~/.ssh/config
      return url;
    }

    return url;
  }

  private async configureAuth(git: SimpleGit, auth: GitAuthConfig): Promise<void> {
    if (auth.type === 'PAT' && auth.token) {
      // Configure credential helper for this session
      await git.addConfig('credential.helper', 'store', false, 'local');
    }
  }

  private parseFileStatus(file: { binary: boolean; file: string; insertions?: number; deletions?: number }): 'A' | 'M' | 'D' | 'R' | 'C' {
    // simple-git doesn't give us the actual status, so we infer from insertions/deletions
    if (file.binary) {
      return 'M'; // Binary files are typically modified
    }

    const insertions = file.insertions || 0;
    const deletions = file.deletions || 0;

    if (insertions > 0 && deletions === 0) {
      return 'A'; // Likely added
    }
    if (insertions === 0 && deletions > 0) {
      return 'D'; // Likely deleted
    }
    return 'M'; // Modified
  }
}
