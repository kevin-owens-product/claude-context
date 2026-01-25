/**
 * Feature Requests Module - API endpoints for feature backlog management
 * @prompt-id forge-v4.1:api:module:feature-requests:001
 * @generated-at 2026-01-24T00:00:00Z
 * @model claude-opus-4-5
 */

import { Module } from '@nestjs/common';
import type { PrismaClient } from '@prisma/client';
import type { Redis } from 'ioredis';
import { FeatureRequestsController } from './feature-requests.controller';
import { FeatureRequestService } from '@forge/context';

@Module({
  controllers: [FeatureRequestsController],
  providers: [
    {
      provide: FeatureRequestService,
      useFactory: (prisma: PrismaClient, redis: Redis) => {
        return new FeatureRequestService(prisma, redis);
      },
      inject: ['PRISMA_CLIENT', 'REDIS_CLIENT'],
    },
  ],
  exports: [FeatureRequestService],
})
export class FeatureRequestsModule {}
