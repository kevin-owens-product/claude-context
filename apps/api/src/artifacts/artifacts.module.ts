/**
 * Artifacts Module - API endpoints for living artifacts
 * @prompt-id forge-v4.1:api:module:artifacts:001
 * @generated-at 2026-01-23T00:00:00Z
 * @model claude-opus-4-5
 */

import { Module } from '@nestjs/common';
import type { PrismaClient } from '@prisma/client';
import type { Redis } from 'ioredis';
import { ArtifactsController } from './artifacts.controller';
import { ArtifactService } from '@forge/context';

@Module({
  controllers: [ArtifactsController],
  providers: [
    {
      provide: ArtifactService,
      useFactory: (prisma: PrismaClient, redis: Redis) => {
        return new ArtifactService(prisma, redis);
      },
      inject: ['PRISMA_CLIENT', 'REDIS_CLIENT'],
    },
  ],
  exports: [ArtifactService],
})
export class ArtifactsModule {}
