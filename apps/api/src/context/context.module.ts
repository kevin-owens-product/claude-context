/**
 * @prompt-id forge-v4.1:api:module:context:001
 * @generated-at 2026-01-22T00:00:00Z
 * @model claude-opus-4-5
 */

import { Module } from '@nestjs/common';
import { ContextController } from './controllers/context.controller';
import { ContextService } from '@forge/context';

@Module({
  controllers: [ContextController],
  providers: [
    {
      provide: ContextService,
      useFactory: (prisma: any, redis: any) => {
        return new ContextService(prisma, redis);
      },
      inject: ['PRISMA_CLIENT', 'REDIS_CLIENT'],
    },
  ],
  exports: [ContextService],
})
export class ContextModule {}
