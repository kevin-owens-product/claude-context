/**
 * Releases Module - API endpoints for release management
 * @prompt-id forge-v4.1:api:module:releases:001
 * @generated-at 2026-01-24T00:00:00Z
 * @model claude-opus-4-5
 */

import { Module } from '@nestjs/common';
import type { PrismaClient } from '@prisma/client';
import type { Redis } from 'ioredis';
import { ReleasesController } from './releases.controller';
import { ReleaseService } from '@forge/context';

@Module({
  controllers: [ReleasesController],
  providers: [
    {
      provide: ReleaseService,
      useFactory: (prisma: PrismaClient, redis: Redis) => {
        return new ReleaseService(prisma, redis);
      },
      inject: ['PRISMA_CLIENT', 'REDIS_CLIENT'],
    },
  ],
  exports: [ReleaseService],
})
export class ReleasesModule {}
