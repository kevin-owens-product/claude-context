/**
 * @prompt-id forge-v4.1:module:subscription:001
 * @generated-at 2026-01-22T00:00:00Z
 * @model claude-opus-4-5
 */

import { Module } from '@nestjs/common';
import { SubscriptionService } from './subscription.service';
import { SubscriptionGateway } from './subscription.gateway';
import { SubscriptionController } from './subscription.controller';
import { EventPublisher } from './event-publisher.service';
import { DatabaseModule } from '../database/database.module';
import { AuthModule } from '../auth/auth.module';

@Module({
  imports: [DatabaseModule, AuthModule],
  controllers: [SubscriptionController],
  providers: [SubscriptionService, SubscriptionGateway, EventPublisher],
  exports: [SubscriptionService, EventPublisher],
})
export class SubscriptionModule {}
