/**
 * Identity Module - API endpoints for identity graph management
 * @prompt-id forge-v4.1:api:module:identity:001
 * @generated-at 2026-01-23T00:00:00Z
 * @model claude-opus-4-5
 */

import { Module } from '@nestjs/common';
import type { PrismaClient } from '@prisma/client';
import type { Redis } from 'ioredis';
import { IdentityController } from './identity.controller';
import { IdentityService } from '@forge/context';

@Module({
  controllers: [IdentityController],
  providers: [
    {
      provide: IdentityService,
      useFactory: (prisma: PrismaClient, redis: Redis) => {
        return new IdentityService(prisma, redis);
      },
      inject: ['PRISMA_CLIENT', 'REDIS_CLIENT'],
    },
  ],
  exports: [IdentityService],
})
export class IdentityModule {}
