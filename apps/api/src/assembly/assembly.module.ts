/**
 * Assembly Module - API endpoints for context assembly
 * @prompt-id forge-v4.1:api:module:assembly:001
 * @generated-at 2026-01-23T00:00:00Z
 * @model claude-opus-4-5
 */

import { Module } from '@nestjs/common';
import type { PrismaClient } from '@prisma/client';
import type { Redis } from 'ioredis';
import { AssemblyController } from './assembly.controller';
import {
  AssemblyService,
  IdentityService,
  ProjectService,
  EmbeddingService,
} from '@forge/context';

@Module({
  controllers: [AssemblyController],
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
    {
      provide: EmbeddingService,
      useFactory: (prisma: PrismaClient, redis: Redis) => {
        return new EmbeddingService(prisma, redis);
      },
      inject: ['PRISMA_CLIENT', 'REDIS_CLIENT'],
    },
    {
      provide: AssemblyService,
      useFactory: (
        prisma: PrismaClient,
        redis: Redis,
        identityService: IdentityService,
        projectService: ProjectService,
        embeddingService: EmbeddingService
      ) => {
        return new AssemblyService(
          prisma,
          redis,
          identityService,
          projectService,
          embeddingService
        );
      },
      inject: [
        'PRISMA_CLIENT',
        'REDIS_CLIENT',
        IdentityService,
        ProjectService,
        EmbeddingService,
      ],
    },
  ],
  exports: [AssemblyService],
})
export class AssemblyModule {}
