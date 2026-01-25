/**
 * Repositories Module - Codebase observation API
 * @prompt-id forge-v4.1:api:module:repositories:001
 * @generated-at 2026-01-25T00:00:00Z
 * @model claude-opus-4-5
 */

import { Module } from '@nestjs/common';
import { RepositoryService } from '@forge/context';
import { DatabaseModule } from '../database/database.module';
import { RepositoriesController } from './repositories.controller';

@Module({
  imports: [DatabaseModule],
  controllers: [RepositoriesController],
  providers: [
    {
      provide: RepositoryService,
      useFactory: (prisma: any, redis: any) => {
        const baseRepoPath = process.env.REPO_BASE_PATH || '/data/repos';
        return new RepositoryService(prisma, redis, baseRepoPath);
      },
      inject: ['PrismaClient', 'Redis'],
    },
  ],
  exports: [RepositoryService],
})
export class RepositoriesModule {}
