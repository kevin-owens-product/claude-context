/**
 * @prompt-id forge-v4.1:api:module:app:001
 * @generated-at 2026-01-22T00:00:00Z
 * @model claude-opus-4-5
 */

import { Module } from '@nestjs/common';
import { APP_FILTER } from '@nestjs/core';
import { PrismaClient } from '@prisma/client';
import { Redis } from 'ioredis';
import { Queue } from 'bullmq';

import { ContextModule } from './context/context.module';
import { SliceModule } from './slice/slice.module';
import { FeedbackModule } from './feedback/feedback.module';
import { AllExceptionsFilter } from './common/filters/http-exception.filter';

@Module({
  imports: [ContextModule, SliceModule, FeedbackModule],
  providers: [
    // Global exception filter
    {
      provide: APP_FILTER,
      useClass: AllExceptionsFilter,
    },
    // Prisma client
    {
      provide: 'PRISMA_CLIENT',
      useFactory: () => {
        const prisma = new PrismaClient({
          log: process.env.NODE_ENV === 'development'
            ? ['query', 'info', 'warn', 'error']
            : ['error'],
        });
        return prisma;
      },
    },
    // Redis client
    {
      provide: 'REDIS_CLIENT',
      useFactory: () => {
        const redis = new Redis({
          host: process.env.REDIS_HOST || 'localhost',
          port: parseInt(process.env.REDIS_PORT || '6379', 10),
          password: process.env.REDIS_PASSWORD,
          db: parseInt(process.env.REDIS_DB || '0', 10),
        });
        return redis;
      },
    },
    // Optional feedback queue
    {
      provide: 'FEEDBACK_QUEUE',
      useFactory: () => {
        if (!process.env.ENABLE_FEEDBACK_QUEUE) {
          return undefined;
        }
        return new Queue('feedback', {
          connection: {
            host: process.env.REDIS_HOST || 'localhost',
            port: parseInt(process.env.REDIS_PORT || '6379', 10),
            password: process.env.REDIS_PASSWORD,
          },
        });
      },
    },
  ],
  exports: ['PRISMA_CLIENT', 'REDIS_CLIENT'],
})
export class AppModule {}
