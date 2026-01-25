/**
 * Use Cases Module - API endpoints for solution templates and implementations
 * @prompt-id forge-v4.1:api:module:use-cases:001
 * @generated-at 2026-01-24T00:00:00Z
 * @model claude-opus-4-5
 */

import { Module } from '@nestjs/common';
import type { PrismaClient } from '@prisma/client';
import type { Redis } from 'ioredis';
import { UseCasesController } from './use-cases.controller';
import { UseCaseService } from '@forge/context';

@Module({
  controllers: [UseCasesController],
  providers: [
    {
      provide: UseCaseService,
      useFactory: (prisma: PrismaClient, redis: Redis) => {
        return new UseCaseService(prisma, redis);
      },
      inject: ['PRISMA_CLIENT', 'REDIS_CLIENT'],
    },
  ],
  exports: [UseCaseService],
})
export class UseCasesModule {}
