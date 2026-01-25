/**
 * Workflow Listener Service - Listens to context events and triggers workflows
 * @prompt-id forge-v4.1:api:service:workflow-listener:001
 * @generated-at 2026-01-24T00:00:00Z
 * @model claude-opus-4-5
 */

import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import {
  WorkflowService,
  type TenantId,
  type TriggerContext,
} from '@forge/context';

interface ContextEvent {
  id: string;
  tenantId: string;
  eventType: string;
  entityType: string;
  entityId: string;
  payload: Record<string, unknown>;
  previousState?: Record<string, unknown>;
  metadata?: Record<string, unknown>;
  timestamp: Date;
}

@Injectable()
export class WorkflowListenerService implements OnModuleInit {
  private readonly logger = new Logger(WorkflowListenerService.name);

  constructor(private readonly workflowService: WorkflowService) {}

  onModuleInit() {
    this.logger.log('Workflow listener initialized');
  }

  /**
   * Handle a context event and trigger matching workflows
   * This method should be called from an EventEmitter listener or message queue consumer
   */
  async handleContextEvent(event: ContextEvent): Promise<void> {
    this.logger.debug(
      `Processing event ${event.eventType} on ${event.entityType}:${event.entityId}`
    );

    try {
      // Build trigger context from the event
      const context: TriggerContext = {
        eventType: event.eventType,
        entityType: event.entityType,
        entityId: event.entityId,
        entity: event.payload,
        previousState: event.previousState,
        metadata: {
          ...event.metadata,
          eventId: event.id,
          timestamp: event.timestamp,
        },
      };

      // Find workflows that match this trigger
      const workflows = await this.workflowService.evaluateTrigger(
        event.tenantId as TenantId,
        context
      );

      this.logger.debug(`Found ${workflows.length} matching workflows`);

      // Evaluate conditions and execute matching workflows
      for (const workflow of workflows) {
        try {
          const conditionsMet = await this.workflowService.evaluateConditions(
            workflow,
            context
          );

          if (conditionsMet) {
            this.logger.log(
              `Executing workflow "${workflow.name}" (${workflow.id}) for event ${event.id}`
            );

            await this.workflowService.executeWorkflow(
              event.tenantId as TenantId,
              workflow.id,
              context
            );

            this.logger.log(
              `Workflow "${workflow.name}" executed successfully`
            );
          } else {
            this.logger.debug(
              `Workflow "${workflow.name}" conditions not met, skipping`
            );
          }
        } catch (error) {
          this.logger.error(
            `Failed to execute workflow "${workflow.name}": ${error instanceof Error ? error.message : String(error)}`
          );
        }
      }
    } catch (error) {
      this.logger.error(
        `Failed to process event ${event.id}: ${error instanceof Error ? error.message : String(error)}`
      );
    }
  }

  /**
   * Handle a signal change event and trigger matching workflows
   */
  async handleSignalEvent(
    tenantId: string,
    signal: {
      id: string;
      type: string;
      health: string;
      previousHealth?: string;
      currentValue: number;
      threshold?: number;
    }
  ): Promise<void> {
    this.logger.debug(`Processing signal event for signal ${signal.id}`);

    try {
      const context: TriggerContext = {
        signal: {
          id: signal.id,
          type: signal.type,
          health: signal.health,
          previousHealth: signal.previousHealth,
          currentValue: signal.currentValue,
          threshold: signal.threshold,
        },
        metadata: {
          signalId: signal.id,
          timestamp: new Date(),
        },
      };

      // Find workflows that match this signal trigger
      const workflows = await this.workflowService.evaluateTrigger(
        tenantId as TenantId,
        context
      );

      this.logger.debug(`Found ${workflows.length} matching signal workflows`);

      for (const workflow of workflows) {
        try {
          const conditionsMet = await this.workflowService.evaluateConditions(
            workflow,
            context
          );

          if (conditionsMet) {
            this.logger.log(
              `Executing signal workflow "${workflow.name}" (${workflow.id})`
            );

            await this.workflowService.executeWorkflow(
              tenantId as TenantId,
              workflow.id,
              context
            );

            this.logger.log(
              `Signal workflow "${workflow.name}" executed successfully`
            );
          }
        } catch (error) {
          this.logger.error(
            `Failed to execute signal workflow "${workflow.name}": ${error instanceof Error ? error.message : String(error)}`
          );
        }
      }
    } catch (error) {
      this.logger.error(
        `Failed to process signal event: ${error instanceof Error ? error.message : String(error)}`
      );
    }
  }

  /**
   * Manually trigger a scheduled workflow
   * This would typically be called by a cron job scheduler
   */
  async executeScheduledWorkflow(
    tenantId: string,
    workflowId: string
  ): Promise<void> {
    this.logger.log(`Executing scheduled workflow ${workflowId}`);

    try {
      const context: TriggerContext = {
        metadata: {
          triggeredBy: 'schedule',
          timestamp: new Date(),
        },
      };

      await this.workflowService.executeWorkflow(
        tenantId as TenantId,
        workflowId as any,
        context
      );

      this.logger.log(`Scheduled workflow ${workflowId} executed successfully`);
    } catch (error) {
      this.logger.error(
        `Failed to execute scheduled workflow ${workflowId}: ${error instanceof Error ? error.message : String(error)}`
      );
    }
  }
}
