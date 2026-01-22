/**
 * @prompt-id forge-v4.1:api:module:app:001
 * @generated-at 2026-01-22T00:00:00Z
 * @model claude-opus-4-5
 */

import { Module } from '@nestjs/common';
import { APP_FILTER } from '@nestjs/core';

import { DatabaseModule } from './database/database.module';
import { ContextModule } from './context/context.module';
import { SliceModule } from './slice/slice.module';
import { FeedbackModule } from './feedback/feedback.module';
import { AllExceptionsFilter } from './common/filters/http-exception.filter';

@Module({
  imports: [DatabaseModule, ContextModule, SliceModule, FeedbackModule],
  providers: [
    {
      provide: APP_FILTER,
      useClass: AllExceptionsFilter,
    },
  ],
})
export class AppModule {}
