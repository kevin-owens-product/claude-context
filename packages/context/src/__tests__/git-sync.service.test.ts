/**
 * Git Sync Service Tests
 * @prompt-id forge-v4.1:test:git-sync:001
 * @generated-at 2026-01-25T00:00:00Z
 * @model claude-opus-4-5
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { GitSyncService } from '../services/git-sync.service';

// Mock simple-git
vi.mock('simple-git', () => {
  const mockGit = {
    clone: vi.fn().mockResolvedValue(undefined),
    fetch: vi.fn().mockResolvedValue(undefined),
    pull: vi.fn().mockResolvedValue(undefined),
    branch: vi.fn().mockResolvedValue({
      current: 'main',
      all: ['main', 'develop', 'remotes/origin/main'],
    }),
    remote: vi.fn().mockResolvedValue('origin\thttps://github.com/test/repo.git (fetch)\n'),
    revparse: vi.fn().mockResolvedValue('abc123def456'),
    log: vi.fn().mockResolvedValue({
      latest: {
        hash: 'abc123def456',
        message: 'Test commit',
        author_name: 'Test Author',
        author_email: 'test@example.com',
        date: '2026-01-25T00:00:00Z',
        refs: '',
      },
      all: [
        {
          hash: 'abc123def456',
          message: 'Test commit',
          author_name: 'Test Author',
          author_email: 'test@example.com',
          date: '2026-01-25T00:00:00Z',
          refs: '',
        },
      ],
      total: 1,
    }),
    diffSummary: vi.fn().mockResolvedValue({
      changed: 2,
      insertions: 10,
      deletions: 5,
      files: [
        { file: 'src/index.ts', insertions: 5, deletions: 2, binary: false },
        { file: 'src/utils.ts', insertions: 5, deletions: 3, binary: false },
      ],
    }),
    raw: vi.fn().mockResolvedValue('src/index.ts\nsrc/utils.ts\n'),
    show: vi.fn().mockResolvedValue('file content here'),
    addConfig: vi.fn().mockResolvedValue(undefined),
  };

  return {
    default: vi.fn(() => mockGit),
  };
});

// Mock fs
vi.mock('fs', () => ({
  promises: {
    mkdir: vi.fn().mockResolvedValue(undefined),
    rm: vi.fn().mockResolvedValue(undefined),
  },
}));

describe('GitSyncService', () => {
  let service: GitSyncService;

  beforeEach(() => {
    vi.clearAllMocks();
    service = new GitSyncService('/test/repos');
  });

  describe('getRepoLocalPath', () => {
    it('should build correct local path', () => {
      const path = service.getRepoLocalPath('tenant-1', 'repo-1');
      expect(path).toBe('/test/repos/tenant-1/repo-1');
    });
  });

  describe('cloneRepository', () => {
    it('should clone a repository', async () => {
      await service.cloneRepository(
        'https://github.com/test/repo.git',
        '/test/repos/tenant-1/repo-1'
      );

      // Verify simple-git clone was called
      const simpleGit = (await import('simple-git')).default;
      const git = simpleGit();
      expect(git.clone).toHaveBeenCalled();
    });

    it('should handle clone with depth option', async () => {
      await service.cloneRepository(
        'https://github.com/test/repo.git',
        '/test/repos/tenant-1/repo-1',
        undefined,
        { depth: 1 }
      );

      const simpleGit = (await import('simple-git')).default;
      const git = simpleGit();
      expect(git.clone).toHaveBeenCalled();
    });

    it('should handle clone with PAT authentication', async () => {
      await service.cloneRepository(
        'https://github.com/test/repo.git',
        '/test/repos/tenant-1/repo-1',
        { type: 'PAT', token: 'test-token' }
      );

      const simpleGit = (await import('simple-git')).default;
      const git = simpleGit();
      expect(git.clone).toHaveBeenCalled();
    });
  });

  describe('getRepoInfo', () => {
    it('should get repository info', async () => {
      const info = await service.getRepoInfo('/test/repos/tenant-1/repo-1');

      expect(info.currentBranch).toBe('main');
      expect(info.branches).toContain('main');
      expect(info.headCommit).toBe('abc123def456');
    });
  });

  describe('listBranches', () => {
    it('should list all branches', async () => {
      const branches = await service.listBranches('/test/repos/tenant-1/repo-1');

      expect(branches).toContain('main');
      expect(branches).toContain('develop');
    });
  });

  describe('getCommits', () => {
    it('should get commit history', async () => {
      const commits = await service.getCommits('/test/repos/tenant-1/repo-1', {
        limit: 10,
      });

      expect(commits).toHaveLength(1);
      expect(commits[0].sha).toBe('abc123def456');
      expect(commits[0].authorName).toBe('Test Author');
    });

    it('should get commits between two refs', async () => {
      const commits = await service.getCommits('/test/repos/tenant-1/repo-1', {
        from: 'abc123',
        to: 'def456',
      });

      expect(commits).toHaveLength(1);
    });
  });

  describe('getCommitDiff', () => {
    it('should get commit diff', async () => {
      const diff = await service.getCommitDiff('/test/repos/tenant-1/repo-1', 'abc123');

      expect(diff.commit.sha).toBe('abc123def456');
      expect(diff.files).toHaveLength(2);
      expect(diff.stats.filesChanged).toBe(2);
      expect(diff.stats.insertions).toBe(10);
      expect(diff.stats.deletions).toBe(5);
    });
  });

  describe('listFilesAtCommit', () => {
    it('should list files at HEAD', async () => {
      const files = await service.listFilesAtCommit('/test/repos/tenant-1/repo-1');

      expect(files).toHaveLength(2);
      expect(files[0].path).toBe('src/index.ts');
      expect(files[0].type).toBe('file');
    });

    it('should list files at specific commit', async () => {
      const files = await service.listFilesAtCommit(
        '/test/repos/tenant-1/repo-1',
        'abc123'
      );

      expect(files).toHaveLength(2);
    });
  });

  describe('getFileContent', () => {
    it('should get file content', async () => {
      const content = await service.getFileContent(
        '/test/repos/tenant-1/repo-1',
        'src/index.ts'
      );

      expect(content).toBe('file content here');
    });
  });

  describe('getChangesBetween', () => {
    it('should get changes between commits', async () => {
      const changes = await service.getChangesBetween(
        '/test/repos/tenant-1/repo-1',
        'abc123',
        'def456'
      );

      expect(changes).toHaveLength(2);
      expect(changes[0].path).toBe('src/index.ts');
    });
  });

  describe('getHeadCommit', () => {
    it('should get HEAD commit SHA', async () => {
      const sha = await service.getHeadCommit('/test/repos/tenant-1/repo-1');

      expect(sha).toBe('abc123def456');
    });
  });

  describe('isGitRepository', () => {
    it('should return true for valid git repository', async () => {
      const isRepo = await service.isGitRepository('/test/repos/tenant-1/repo-1');

      expect(isRepo).toBe(true);
    });
  });

  describe('fetchUpdates', () => {
    it('should fetch updates from remote', async () => {
      await service.fetchUpdates('/test/repos/tenant-1/repo-1');

      const simpleGit = (await import('simple-git')).default;
      const git = simpleGit();
      expect(git.fetch).toHaveBeenCalled();
    });

    it('should fetch with prune option', async () => {
      await service.fetchUpdates(
        '/test/repos/tenant-1/repo-1',
        undefined,
        { prune: true }
      );

      const simpleGit = (await import('simple-git')).default;
      const git = simpleGit();
      expect(git.fetch).toHaveBeenCalled();
    });
  });

  describe('pull', () => {
    it('should pull latest changes', async () => {
      await service.pull('/test/repos/tenant-1/repo-1', 'main');

      const simpleGit = (await import('simple-git')).default;
      const git = simpleGit();
      expect(git.pull).toHaveBeenCalledWith('origin', 'main');
    });
  });

  describe('deleteRepository', () => {
    it('should delete repository directory', async () => {
      await service.deleteRepository('/test/repos/tenant-1/repo-1');

      const fs = await import('fs');
      expect(fs.promises.rm).toHaveBeenCalledWith(
        '/test/repos/tenant-1/repo-1',
        { recursive: true, force: true }
      );
    });
  });

  describe('getFileCommitCount', () => {
    it('should get commit count for a file', async () => {
      const count = await service.getFileCommitCount(
        '/test/repos/tenant-1/repo-1',
        'src/index.ts'
      );

      expect(count).toBe(1);
    });
  });

  describe('getFileAuthors', () => {
    it('should get unique authors for a file', async () => {
      // Mock raw for git log --format=%ae
      const simpleGit = (await import('simple-git')).default;
      const git = simpleGit();
      (git.raw as any).mockResolvedValueOnce('test@example.com\nother@example.com\ntest@example.com\n');

      const authors = await service.getFileAuthors(
        '/test/repos/tenant-1/repo-1',
        'src/index.ts'
      );

      expect(authors).toHaveLength(2);
      expect(authors).toContain('test@example.com');
      expect(authors).toContain('other@example.com');
    });
  });
});
