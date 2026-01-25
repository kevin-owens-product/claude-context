/**
 * SignalsModule - API module for signals
 */

import { Module } from '@nestjs/common';
import { SignalsController } from './signals.controller';
import { SignalService } from '@forge/context';
import type { PrismaClient } from '@prisma/client';
import type Redis from 'ioredis';

@Module({
  controllers: [SignalsController],
  providers: [
    {
      provide: SignalService,
      useFactory: (prisma: PrismaClient, redis: Redis) => {
        return new SignalService(prisma, redis);
      },
      inject: ['PRISMA_CLIENT', 'REDIS_CLIENT'],
    },
  ],
  exports: [SignalService],
})
export class SignalsModule {}
