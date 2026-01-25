/**
 * ExperimentsModule - API module for experiments
 */

import { Module } from '@nestjs/common';
import { ExperimentsController } from './experiments.controller';
import { ExperimentService } from '@forge/context';
import type { PrismaClient } from '@prisma/client';
import type Redis from 'ioredis';

@Module({
  controllers: [ExperimentsController],
  providers: [
    {
      provide: ExperimentService,
      useFactory: (prisma: PrismaClient, redis: Redis) => {
        return new ExperimentService(prisma, redis);
      },
      inject: ['PRISMA_CLIENT', 'REDIS_CLIENT'],
    },
  ],
  exports: [ExperimentService],
})
export class ExperimentsModule {}
