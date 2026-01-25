/**
 * Outcomes Module - API endpoints for OKRs and customer outcomes
 * @prompt-id forge-v4.1:api:module:outcomes:001
 * @generated-at 2026-01-24T00:00:00Z
 * @model claude-opus-4-5
 */

import { Module } from '@nestjs/common';
import type { PrismaClient } from '@prisma/client';
import type { Redis } from 'ioredis';
import { OutcomesController } from './outcomes.controller';
import { OutcomesService } from '@forge/context';

@Module({
  controllers: [OutcomesController],
  providers: [
    {
      provide: OutcomesService,
      useFactory: (prisma: PrismaClient, redis: Redis) => {
        return new OutcomesService(prisma, redis);
      },
      inject: ['PRISMA_CLIENT', 'REDIS_CLIENT'],
    },
  ],
  exports: [OutcomesService],
})
export class OutcomesModule {}
