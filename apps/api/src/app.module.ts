/**
 * @prompt-id forge-v4.1:api:module:app:001
 * @generated-at 2026-01-23T00:00:00Z
 * @model claude-opus-4-5
 */

import { Module } from '@nestjs/common';
import { APP_FILTER } from '@nestjs/core';

import { DatabaseModule } from './database/database.module';
import { ContextModule } from './context/context.module';
import { SliceModule } from './slice/slice.module';
import { FeedbackModule } from './feedback/feedback.module';
import { AllExceptionsFilter } from './common/filters/http-exception.filter';

// Living Software Platform Modules
import { IdentityModule } from './identity/identity.module';
import { ProjectsModule } from './projects/projects.module';
import { IntentGraphsModule } from './intent-graphs/intent-graphs.module';
import { ArtifactsModule } from './artifacts/artifacts.module';
import { AssemblyModule } from './assembly/assembly.module';

// Living Software Modules
import { IntentsModule } from './intents/intents.module';
import { SignalsModule } from './signals/signals.module';
import { CapabilitiesModule } from './capabilities/capabilities.module';
import { ExperimentsModule } from './experiments/experiments.module';

// Business Outcomes Integration Modules
import { CustomersModule } from './customers/customers.module';
import { CustomerFeedbackModule } from './customer-feedback/customer-feedback.module';
import { FeatureRequestsModule } from './feature-requests/feature-requests.module';
import { DealsModule } from './deals/deals.module';
import { OutcomesModule } from './outcomes/outcomes.module';
import { UseCasesModule } from './use-cases/use-cases.module';
import { ReleasesModule } from './releases/releases.module';

// Workflow Automation Module
import { WorkflowsModule } from './workflows/workflows.module';

// Codebase Observation Engine
import { RepositoriesModule } from './repositories/repositories.module';

@Module({
  imports: [
    DatabaseModule,
    ContextModule,
    SliceModule,
    FeedbackModule,
    // Living Software Platform
    IdentityModule,
    ProjectsModule,
    IntentGraphsModule,
    ArtifactsModule,
    AssemblyModule,
    // Living Software
    IntentsModule,
    SignalsModule,
    CapabilitiesModule,
    ExperimentsModule,
    // Business Outcomes Integration
    CustomersModule,
    CustomerFeedbackModule,
    FeatureRequestsModule,
    DealsModule,
    OutcomesModule,
    UseCasesModule,
    ReleasesModule,
    // Workflow Automation
    WorkflowsModule,
    // Codebase Observation Engine
    RepositoriesModule,
  ],
  providers: [
    {
      provide: APP_FILTER,
      useClass: AllExceptionsFilter,
    },
  ],
})
export class AppModule {}
