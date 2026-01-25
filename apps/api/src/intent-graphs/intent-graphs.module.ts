/**
 * Intent Graphs Module - API endpoints for intent graph management
 * @prompt-id forge-v4.1:api:module:intent-graphs:001
 * @generated-at 2026-01-23T00:00:00Z
 * @model claude-opus-4-5
 */

import { Module } from '@nestjs/common';
import type { PrismaClient } from '@prisma/client';
import type { Redis } from 'ioredis';
import { IntentGraphsController } from './intent-graphs.controller';
import { IntentGraphService } from '@forge/context';

@Module({
  controllers: [IntentGraphsController],
  providers: [
    {
      provide: IntentGraphService,
      useFactory: (prisma: PrismaClient, redis: Redis) => {
        return new IntentGraphService(prisma, redis);
      },
      inject: ['PRISMA_CLIENT', 'REDIS_CLIENT'],
    },
  ],
  exports: [IntentGraphService],
})
export class IntentGraphsModule {}
