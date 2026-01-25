/**
 * CapabilitiesModule - API module for capabilities
 */

import { Module } from '@nestjs/common';
import { CapabilitiesController } from './capabilities.controller';
import { CapabilityService } from '@forge/context';
import type { PrismaClient } from '@prisma/client';
import type Redis from 'ioredis';

@Module({
  controllers: [CapabilitiesController],
  providers: [
    {
      provide: CapabilityService,
      useFactory: (prisma: PrismaClient, redis: Redis) => {
        return new CapabilityService(prisma, redis);
      },
      inject: ['PRISMA_CLIENT', 'REDIS_CLIENT'],
    },
  ],
  exports: [CapabilityService],
})
export class CapabilitiesModule {}
