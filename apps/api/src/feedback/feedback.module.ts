/**
 * @prompt-id forge-v4.1:api:module:feedback:001
 * @generated-at 2026-01-22T00:00:00Z
 * @model claude-opus-4-5
 */

import { Module } from '@nestjs/common';
import { FeedbackController } from './controllers/feedback.controller';
import { FeedbackService } from '@forge/context';

@Module({
  controllers: [FeedbackController],
  providers: [
    {
      provide: FeedbackService,
      useFactory: (prisma: any, redis: any, queue?: any) => {
        return new FeedbackService(prisma, redis, queue);
      },
      inject: ['PRISMA_CLIENT', 'REDIS_CLIENT', { token: 'FEEDBACK_QUEUE', optional: true }],
    },
  ],
  exports: [FeedbackService],
})
export class FeedbackModule {}
