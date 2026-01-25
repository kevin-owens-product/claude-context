/**
 * Workflows Module - API endpoints for workflow automation
 * @prompt-id forge-v4.1:api:module:workflows:001
 * @generated-at 2026-01-24T00:00:00Z
 * @model claude-opus-4-5
 */

import { Module } from '@nestjs/common';
import { ScheduleModule } from '@nestjs/schedule';
import type { PrismaClient } from '@prisma/client';
import type { Redis } from 'ioredis';
import { WorkflowsController } from './workflows.controller';
import { WorkflowTemplatesController } from './templates.controller';
import { WorkflowListenerService } from './workflow-listener.service';
import { WorkflowSchedulerService } from './workflow-scheduler.service';
import { WorkflowService } from '@forge/context';

@Module({
  imports: [ScheduleModule.forRoot()],
  controllers: [WorkflowsController, WorkflowTemplatesController],
  providers: [
    {
      provide: WorkflowService,
      useFactory: (prisma: PrismaClient, redis: Redis) => {
        return new WorkflowService(prisma, redis);
      },
      inject: ['PRISMA_CLIENT', 'REDIS_CLIENT'],
    },
    WorkflowListenerService,
    WorkflowSchedulerService,
  ],
  exports: [WorkflowService, WorkflowSchedulerService],
})
export class WorkflowsModule {}
