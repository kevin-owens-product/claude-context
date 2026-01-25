/**
 * IntentsModule - API module for intents
 */

import { Module } from '@nestjs/common';
import { IntentsController } from './intents.controller';
import { IntentService } from '@forge/context';
import { DatabaseModule } from '../database/database.module';
import type { PrismaClient } from '@prisma/client';
import type Redis from 'ioredis';

@Module({
  controllers: [IntentsController],
  providers: [
    {
      provide: IntentService,
      useFactory: (prisma: PrismaClient, redis: Redis) => {
        return new IntentService(prisma, redis);
      },
      inject: ['PRISMA_CLIENT', 'REDIS_CLIENT'],
    },
  ],
  exports: [IntentService],
})
export class IntentsModule {}
