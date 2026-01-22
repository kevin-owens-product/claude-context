/**
 * @prompt-id forge-v4.1:api:module:feedback:001
 * @generated-at 2026-01-22T00:00:00Z
 * @model claude-opus-4-5
 */

import { Module, Optional, Inject } from '@nestjs/common';
import type { PrismaClient } from '@prisma/client';
import type { Redis } from 'ioredis';
import type { Queue } from 'bullmq';
import { FeedbackController } from './controllers/feedback.controller';
import { FeedbackService } from '@forge/context';

@Module({
  controllers: [FeedbackController],
  providers: [
    {
      provide: FeedbackService,
      useFactory: (prisma: PrismaClient, redis: Redis, queue: Queue | null) => {
        return new FeedbackService(prisma, redis, queue ?? undefined);
      },
      inject: ['PRISMA_CLIENT', 'REDIS_CLIENT', 'FEEDBACK_QUEUE'],
    },
  ],
  exports: [FeedbackService],
})
export class FeedbackModule {}
