/**
 * Customer Feedback Module - API endpoints for feedback management
 * @prompt-id forge-v4.1:api:module:customer-feedback:001
 * @generated-at 2026-01-24T00:00:00Z
 * @model claude-opus-4-5
 */

import { Module } from '@nestjs/common';
import type { PrismaClient } from '@prisma/client';
import type { Redis } from 'ioredis';
import { CustomerFeedbackController } from './customer-feedback.controller';
import { CustomerFeedbackService } from '@forge/context';

@Module({
  controllers: [CustomerFeedbackController],
  providers: [
    {
      provide: CustomerFeedbackService,
      useFactory: (prisma: PrismaClient, redis: Redis) => {
        return new CustomerFeedbackService(prisma, redis);
      },
      inject: ['PRISMA_CLIENT', 'REDIS_CLIENT'],
    },
  ],
  exports: [CustomerFeedbackService],
})
export class CustomerFeedbackModule {}
