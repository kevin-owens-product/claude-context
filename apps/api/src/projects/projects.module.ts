/**
 * Projects Module - API endpoints for project management
 * @prompt-id forge-v4.1:api:module:projects:001
 * @generated-at 2026-01-23T00:00:00Z
 * @model claude-opus-4-5
 */

import { Module } from '@nestjs/common';
import type { PrismaClient } from '@prisma/client';
import type { Redis } from 'ioredis';
import { ProjectsController } from './projects.controller';
import { ProjectService, IdentityService } from '@forge/context';

@Module({
  controllers: [ProjectsController],
  providers: [
    {
      provide: IdentityService,
      useFactory: (prisma: PrismaClient, redis: Redis) => {
        return new IdentityService(prisma, redis);
      },
      inject: ['PRISMA_CLIENT', 'REDIS_CLIENT'],
    },
    {
      provide: ProjectService,
      useFactory: (
        prisma: PrismaClient,
        redis: Redis,
        identityService: IdentityService
      ) => {
        return new ProjectService(prisma, redis, identityService);
      },
      inject: ['PRISMA_CLIENT', 'REDIS_CLIENT', IdentityService],
    },
  ],
  exports: [ProjectService, IdentityService],
})
export class ProjectsModule {}
