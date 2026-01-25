/**
 * Deals Module - API endpoints for sales pipeline management
 * @prompt-id forge-v4.1:api:module:deals:001
 * @generated-at 2026-01-24T00:00:00Z
 * @model claude-opus-4-5
 */

import { Module } from '@nestjs/common';
import type { PrismaClient } from '@prisma/client';
import type { Redis } from 'ioredis';
import { DealsController } from './deals.controller';
import { DealService } from '@forge/context';

@Module({
  controllers: [DealsController],
  providers: [
    {
      provide: DealService,
      useFactory: (prisma: PrismaClient, redis: Redis) => {
        return new DealService(prisma, redis);
      },
      inject: ['PRISMA_CLIENT', 'REDIS_CLIENT'],
    },
  ],
  exports: [DealService],
})
export class DealsModule {}
