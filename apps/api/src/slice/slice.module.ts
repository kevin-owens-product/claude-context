/**
 * @prompt-id forge-v4.1:api:module:slice:001
 * @generated-at 2026-01-22T00:00:00Z
 * @model claude-opus-4-5
 */

import { Module } from '@nestjs/common';
import { SliceController } from './controllers/slice.controller';
import { SliceService } from '@forge/context';

@Module({
  controllers: [SliceController],
  providers: [
    {
      provide: SliceService,
      useFactory: (prisma: any) => {
        return new SliceService(prisma);
      },
      inject: ['PRISMA_CLIENT'],
    },
  ],
  exports: [SliceService],
})
export class SliceModule {}
