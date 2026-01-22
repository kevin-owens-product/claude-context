/**
 * @prompt-id forge-v4.1:api:module:database:001
 * @generated-at 2026-01-22T00:00:00Z
 * @model claude-opus-4-5
 */

import { Module, Global, OnModuleDestroy, Inject } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';
import { Redis } from 'ioredis';
import { Queue } from 'bullmq';
import { PrismaService } from './prisma.service';

@Global()
@Module({
  providers: [
    PrismaService,
    {
      provide: 'PRISMA_CLIENT',
      useFactory: () => {
        const prisma = new PrismaClient({
          log:
            process.env.NODE_ENV === 'development'
              ? ['query', 'info', 'warn', 'error']
              : ['error'],
        });
        return prisma;
      },
    },
    {
      provide: 'REDIS_CLIENT',
      useFactory: () => {
        return new Redis({
          host: process.env.REDIS_HOST || 'localhost',
          port: parseInt(process.env.REDIS_PORT || '6379', 10),
          password: process.env.REDIS_PASSWORD || undefined,
          db: parseInt(process.env.REDIS_DB || '0', 10),
          lazyConnect: true,
        });
      },
    },
    {
      provide: 'FEEDBACK_QUEUE',
      useFactory: () => {
        if (process.env.ENABLE_FEEDBACK_QUEUE !== 'true') {
          return null;
        }
        return new Queue('feedback', {
          connection: {
            host: process.env.REDIS_HOST || 'localhost',
            port: parseInt(process.env.REDIS_PORT || '6379', 10),
            password: process.env.REDIS_PASSWORD || undefined,
          },
        });
      },
    },
  ],
  exports: [PrismaService, 'PRISMA_CLIENT', 'REDIS_CLIENT', 'FEEDBACK_QUEUE'],
})
export class DatabaseModule implements OnModuleDestroy {
  constructor(
    @Inject('PRISMA_CLIENT') private readonly prisma: PrismaClient,
    @Inject('REDIS_CLIENT') private readonly redis: Redis,
  ) {}

  async onModuleDestroy() {
    await this.prisma.$disconnect();
    await this.redis.quit();
  }
}
