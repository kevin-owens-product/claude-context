/**
 * Repository Service Tests
 * @prompt-id forge-v4.1:test:repository:001
 * @generated-at 2026-01-25T00:00:00Z
 * @model claude-opus-4-5
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { RepositoryService } from '../services/repository.service';
import type { TenantId } from '../types';
import type { RepositoryId, CodeFileId } from '../types/codebase.types';

// Mock Prisma
const mockPrisma = {
  repository: {
    create: vi.fn(),
    findFirst: vi.fn(),
    findUnique: vi.fn(),
    findMany: vi.fn(),
    count: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
  },
  codeFile: {
    findFirst: vi.fn(),
    findUnique: vi.fn(),
    findMany: vi.fn(),
    count: vi.fn(),
    aggregate: vi.fn(),
  },
  fileImport: {
    findMany: vi.fn(),
  },
  codeCommit: {
    findMany: vi.fn(),
    findFirst: vi.fn(),
    count: vi.fn(),
    groupBy: vi.fn(),
  },
  fileChange: {
    groupBy: vi.fn(),
  },
  repoSyncJob: {
    create: vi.fn(),
    findFirst: vi.fn(),
    update: vi.fn(),
  },
};

// Mock Redis
const mockRedis = {
  get: vi.fn(),
  setex: vi.fn(),
  del: vi.fn(),
  keys: vi.fn(),
};

describe('RepositoryService', () => {
  let service: RepositoryService;
  const tenantId = 'tenant-1' as TenantId;

  beforeEach(() => {
    vi.clearAllMocks();
    mockRedis.get.mockResolvedValue(null);
    mockRedis.keys.mockResolvedValue([]);
    service = new RepositoryService(
      mockPrisma as any,
      mockRedis as any,
      '/test/repos'
    );
  });

  describe('createRepository', () => {
    it('should create a new repository', async () => {
      const repoData = {
        id: 'repo-1',
        tenantId,
        name: 'test-repo',
        description: 'Test repository',
        url: 'https://github.com/test/repo.git',
        provider: 'GITHUB',
        defaultBranch: 'main',
        authType: 'NONE',
        authConfig: {},
        status: 'PENDING',
        metadata: {},
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      mockPrisma.repository.create.mockResolvedValue(repoData);

      const result = await service.createRepository(tenantId, {
        name: 'test-repo',
        description: 'Test repository',
        url: 'https://github.com/test/repo.git',
      });

      expect(result.name).toBe('test-repo');
      expect(result.url).toBe('https://github.com/test/repo.git');
      expect(mockPrisma.repository.create).toHaveBeenCalled();
    });

    it('should detect provider from URL', async () => {
      const repoData = {
        id: 'repo-1',
        tenantId,
        name: 'gitlab-repo',
        url: 'https://gitlab.com/test/repo.git',
        provider: 'GITLAB',
        defaultBranch: 'main',
        authType: 'NONE',
        authConfig: {},
        status: 'PENDING',
        metadata: {},
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      mockPrisma.repository.create.mockResolvedValue(repoData);

      await service.createRepository(tenantId, {
        name: 'gitlab-repo',
        url: 'https://gitlab.com/test/repo.git',
      });

      expect(mockPrisma.repository.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            provider: 'GITLAB',
          }),
        })
      );
    });
  });

  describe('getRepository', () => {
    it('should get repository by ID', async () => {
      const repoData = {
        id: 'repo-1',
        tenantId,
        name: 'test-repo',
        url: 'https://github.com/test/repo.git',
        provider: 'GITHUB',
        defaultBranch: 'main',
        authType: 'NONE',
        authConfig: {},
        status: 'ACTIVE',
        metadata: {},
        branches: [],
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      mockPrisma.repository.findFirst.mockResolvedValue(repoData);

      const result = await service.getRepository(tenantId, 'repo-1' as RepositoryId);

      expect(result).not.toBeNull();
      expect(result?.name).toBe('test-repo');
    });

    it('should return cached repository if available', async () => {
      const cachedRepo = {
        id: 'repo-1',
        name: 'cached-repo',
        status: 'ACTIVE',
      };

      mockRedis.get.mockResolvedValue(JSON.stringify(cachedRepo));

      const result = await service.getRepository(tenantId, 'repo-1' as RepositoryId);

      expect(result?.name).toBe('cached-repo');
      expect(mockPrisma.repository.findFirst).not.toHaveBeenCalled();
    });

    it('should return null for non-existent repository', async () => {
      mockPrisma.repository.findFirst.mockResolvedValue(null);

      const result = await service.getRepository(tenantId, 'non-existent' as RepositoryId);

      expect(result).toBeNull();
    });
  });

  describe('listRepositories', () => {
    it('should list repositories with pagination', async () => {
      const repos = [
        {
          id: 'repo-1',
          tenantId,
          name: 'repo-1',
          url: 'https://github.com/test/repo1.git',
          provider: 'GITHUB',
          defaultBranch: 'main',
          authType: 'NONE',
          authConfig: {},
          status: 'ACTIVE',
          metadata: {},
          branches: [],
          createdAt: new Date(),
          updatedAt: new Date(),
        },
        {
          id: 'repo-2',
          tenantId,
          name: 'repo-2',
          url: 'https://github.com/test/repo2.git',
          provider: 'GITHUB',
          defaultBranch: 'main',
          authType: 'NONE',
          authConfig: {},
          status: 'ACTIVE',
          metadata: {},
          branches: [],
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ];

      mockPrisma.repository.findMany.mockResolvedValue(repos);
      mockPrisma.repository.count.mockResolvedValue(2);

      const result = await service.listRepositories(tenantId, {
        limit: 10,
        offset: 0,
      });

      expect(result.data).toHaveLength(2);
      expect(result.total).toBe(2);
    });

    it('should filter by status', async () => {
      mockPrisma.repository.findMany.mockResolvedValue([]);
      mockPrisma.repository.count.mockResolvedValue(0);

      await service.listRepositories(tenantId, {
        status: 'ACTIVE',
      });

      expect(mockPrisma.repository.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            status: 'ACTIVE',
          }),
        })
      );
    });

    it('should search by name', async () => {
      mockPrisma.repository.findMany.mockResolvedValue([]);
      mockPrisma.repository.count.mockResolvedValue(0);

      await service.listRepositories(tenantId, {
        search: 'test',
      });

      expect(mockPrisma.repository.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            OR: expect.any(Array),
          }),
        })
      );
    });
  });

  describe('updateRepository', () => {
    it('should update repository', async () => {
      const existingRepo = {
        id: 'repo-1',
        tenantId,
        name: 'old-name',
      };

      const updatedRepo = {
        id: 'repo-1',
        tenantId,
        name: 'new-name',
        url: 'https://github.com/test/repo.git',
        provider: 'GITHUB',
        defaultBranch: 'main',
        authType: 'NONE',
        authConfig: {},
        status: 'ACTIVE',
        metadata: {},
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      mockPrisma.repository.findFirst.mockResolvedValue(existingRepo);
      mockPrisma.repository.update.mockResolvedValue(updatedRepo);

      const result = await service.updateRepository(
        tenantId,
        'repo-1' as RepositoryId,
        { name: 'new-name' }
      );

      expect(result?.name).toBe('new-name');
    });

    it('should return null if repository not found', async () => {
      mockPrisma.repository.findFirst.mockResolvedValue(null);

      const result = await service.updateRepository(
        tenantId,
        'non-existent' as RepositoryId,
        { name: 'new-name' }
      );

      expect(result).toBeNull();
    });
  });

  describe('deleteRepository', () => {
    it('should delete repository', async () => {
      mockPrisma.repository.findFirst.mockResolvedValue({
        id: 'repo-1',
        tenantId,
        localPath: '/test/repos/tenant-1/repo-1',
      });

      await service.deleteRepository(tenantId, 'repo-1' as RepositoryId);

      expect(mockPrisma.repository.delete).toHaveBeenCalledWith({
        where: { id: 'repo-1' },
      });
    });
  });

  describe('listFiles', () => {
    it('should list files with pagination', async () => {
      const files = [
        {
          id: 'file-1',
          repositoryId: 'repo-1',
          path: 'src/index.ts',
          name: 'index.ts',
          extension: 'ts',
          language: 'typescript',
          fileType: 'SOURCE',
          lineCount: 100,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ];

      mockPrisma.repository.findFirst.mockResolvedValue({ id: 'repo-1' });
      mockPrisma.codeFile.findMany.mockResolvedValue(files);
      mockPrisma.codeFile.count.mockResolvedValue(1);

      const result = await service.listFiles(
        tenantId,
        'repo-1' as RepositoryId,
        { limit: 10 }
      );

      expect(result.data).toHaveLength(1);
      expect(result.data[0].path).toBe('src/index.ts');
    });

    it('should filter by language', async () => {
      mockPrisma.repository.findFirst.mockResolvedValue({ id: 'repo-1' });
      mockPrisma.codeFile.findMany.mockResolvedValue([]);
      mockPrisma.codeFile.count.mockResolvedValue(0);

      await service.listFiles(tenantId, 'repo-1' as RepositoryId, {
        language: 'typescript',
      });

      expect(mockPrisma.codeFile.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            language: 'typescript',
          }),
        })
      );
    });
  });

  describe('getFileDependencies', () => {
    it('should get file dependency graph', async () => {
      mockPrisma.repository.findFirst.mockResolvedValue({ id: 'repo-1' });
      mockPrisma.codeFile.findFirst.mockResolvedValue({
        id: 'file-1',
        repositoryId: 'repo-1',
        path: 'src/index.ts',
      });
      mockPrisma.codeFile.findUnique.mockResolvedValue({
        id: 'file-1',
        repositoryId: 'repo-1',
        path: 'src/index.ts',
        language: 'typescript',
      });
      mockPrisma.fileImport.findMany.mockResolvedValue([]);

      const result = await service.getFileDependencies(
        tenantId,
        'repo-1' as RepositoryId,
        'file-1' as CodeFileId,
        2
      );

      expect(result.root).toBeDefined();
      expect(result.root.path).toBe('src/index.ts');
    });
  });

  describe('getHotspots', () => {
    it('should get high-churn files', async () => {
      mockPrisma.repository.findFirst.mockResolvedValue({ id: 'repo-1' });
      mockPrisma.fileChange.groupBy.mockResolvedValue([
        { fileId: 'file-1', _count: { id: 10 } },
      ]);
      mockPrisma.codeFile.findMany.mockResolvedValue([
        {
          id: 'file-1',
          path: 'src/hotspot.ts',
          lineCount: 500,
          complexity: { cyclomatic: 15 },
        },
      ]);
      mockPrisma.codeCommit.findMany.mockResolvedValue([
        { authorEmail: 'dev1@example.com' },
        { authorEmail: 'dev2@example.com' },
      ]);

      const hotspots = await service.getHotspots(
        tenantId,
        'repo-1' as RepositoryId,
        30
      );

      expect(hotspots).toBeDefined();
      expect(Array.isArray(hotspots)).toBe(true);
    });
  });

  describe('getRepositoryStats', () => {
    it('should get repository statistics', async () => {
      mockPrisma.repository.findFirst.mockResolvedValue({ id: 'repo-1' });
      mockPrisma.codeCommit.count.mockResolvedValue(100);
      mockPrisma.codeCommit.groupBy.mockResolvedValue([
        { authorEmail: 'dev1@example.com' },
        { authorEmail: 'dev2@example.com' },
        { authorEmail: 'dev3@example.com' },
      ]);
      mockPrisma.codeFile.aggregate.mockResolvedValue({
        _avg: { lineCount: 150 },
      });

      const stats = await service.getRepositoryStats(
        tenantId,
        'repo-1' as RepositoryId
      );

      expect(stats).toBeDefined();
      expect(stats.contributorCount).toBe(3);
      expect(stats.commitCount).toBe(100);
    });
  });

  describe('listCommits', () => {
    it('should list commits with pagination', async () => {
      const commits = [
        {
          id: 'commit-1',
          repositoryId: 'repo-1',
          sha: 'abc123def456',
          shortSha: 'abc123d',
          message: 'Test commit',
          authorName: 'Test Author',
          authorEmail: 'test@example.com',
          authoredAt: new Date(),
          committerName: 'Test Author',
          committerEmail: 'test@example.com',
          committedAt: new Date(),
          parentShas: [],
          isMerge: false,
          filesChanged: 2,
          insertions: 10,
          deletions: 5,
          createdAt: new Date(),
        },
      ];

      mockPrisma.repository.findFirst.mockResolvedValue({ id: 'repo-1' });
      mockPrisma.codeCommit.findMany.mockResolvedValue(commits);
      mockPrisma.codeCommit.count.mockResolvedValue(1);

      const result = await service.listCommits(
        tenantId,
        'repo-1' as RepositoryId,
        { limit: 10 }
      );

      expect(result.data).toHaveLength(1);
      expect(result.data[0].sha).toBe('abc123def456');
    });

    it('should filter by author', async () => {
      mockPrisma.repository.findFirst.mockResolvedValue({ id: 'repo-1' });
      mockPrisma.codeCommit.findMany.mockResolvedValue([]);
      mockPrisma.codeCommit.count.mockResolvedValue(0);

      await service.listCommits(tenantId, 'repo-1' as RepositoryId, {
        author: 'test@example.com',
      });

      expect(mockPrisma.codeCommit.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            authorEmail: expect.any(Object),
          }),
        })
      );
    });
  });

  describe('getChangeActivity', () => {
    it('should get change activity over time', async () => {
      const commits = [
        {
          committedAt: new Date('2026-01-20'),
          filesChanged: 5,
          insertions: 100,
          deletions: 50,
        },
        {
          committedAt: new Date('2026-01-20'),
          filesChanged: 3,
          insertions: 50,
          deletions: 25,
        },
        {
          committedAt: new Date('2026-01-21'),
          filesChanged: 2,
          insertions: 30,
          deletions: 10,
        },
      ];

      mockPrisma.repository.findFirst.mockResolvedValue({ id: 'repo-1' });
      mockPrisma.codeCommit.findMany.mockResolvedValue(commits);

      const activity = await service.getChangeActivity(
        tenantId,
        'repo-1' as RepositoryId,
        30
      );

      expect(activity).toHaveLength(2);
      expect(activity[0].date).toBe('2026-01-20');
      expect(activity[0].commits).toBe(2);
    });
  });

  describe('verifyAccess', () => {
    it('should throw error if repository not found', async () => {
      mockPrisma.repository.findFirst.mockResolvedValue(null);

      await expect(
        service.listFiles(tenantId, 'non-existent' as RepositoryId)
      ).rejects.toThrow('Repository not found');
    });
  });
});
