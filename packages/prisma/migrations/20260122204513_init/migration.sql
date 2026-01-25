-- CreateExtension
CREATE EXTENSION IF NOT EXISTS "vector";

-- CreateExtension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- CreateEnum
CREATE TYPE "Plan" AS ENUM ('FREE', 'PRO', 'TEAM', 'ENTERPRISE');

-- CreateEnum
CREATE TYPE "UserRole" AS ENUM ('OWNER', 'ADMIN', 'MEMBER', 'VIEWER');

-- CreateEnum
CREATE TYPE "WorkspaceMemberRole" AS ENUM ('ADMIN', 'MEMBER', 'VIEWER');

-- CreateEnum
CREATE TYPE "ContextNodeType" AS ENUM ('DOCUMENT', 'DECISION', 'PATTERN', 'EXTERNAL_LINK');

-- CreateEnum
CREATE TYPE "ContextLayer" AS ENUM ('ORGANIZATIONAL', 'WORKSPACE', 'SLICE');

-- CreateEnum
CREATE TYPE "Freshness" AS ENUM ('CURRENT', 'STALE', 'ARCHIVED');

-- CreateEnum
CREATE TYPE "EdgeType" AS ENUM ('REFERENCES', 'IMPLEMENTS', 'CONSTRAINS', 'DEPENDS_ON', 'SUPERSEDES');

-- CreateEnum
CREATE TYPE "SliceStatus" AS ENUM ('PENDING', 'ACTIVE', 'IN_REVIEW', 'COMPLETED', 'ARCHIVED');

-- CreateEnum
CREATE TYPE "ReviewVerdict" AS ENUM ('APPROVED', 'CHANGES_REQUESTED', 'REJECTED');

-- CreateEnum
CREATE TYPE "FeedbackRating" AS ENUM ('POSITIVE', 'NEGATIVE', 'SKIPPED');

-- CreateEnum
CREATE TYPE "IntegrationProvider" AS ENUM ('GITHUB', 'NOTION', 'FIGMA', 'SLACK', 'CONFLUENCE', 'LINEAR');

-- CreateEnum
CREATE TYPE "IntegrationStatus" AS ENUM ('PENDING', 'ACTIVE', 'ERROR', 'DISABLED');

-- CreateEnum
CREATE TYPE "SyncJobStatus" AS ENUM ('PENDING', 'RUNNING', 'COMPLETED', 'FAILED');

-- CreateEnum
CREATE TYPE "ChangeType" AS ENUM ('CREATE', 'UPDATE', 'DELETE', 'RESTORE', 'ROLLBACK');

-- CreateTable
CREATE TABLE "tenants" (
    "id" UUID NOT NULL DEFAULT uuid_generate_v4(),
    "name" VARCHAR(255) NOT NULL,
    "slug" VARCHAR(100) NOT NULL,
    "plan" "Plan" NOT NULL DEFAULT 'FREE',
    "settings" JSONB NOT NULL DEFAULT '{}',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "tenants_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "users" (
    "id" UUID NOT NULL DEFAULT uuid_generate_v4(),
    "tenant_id" UUID NOT NULL,
    "email" VARCHAR(255) NOT NULL,
    "name" VARCHAR(255) NOT NULL,
    "avatar_url" VARCHAR(500),
    "role" "UserRole" NOT NULL DEFAULT 'MEMBER',
    "settings" JSONB NOT NULL DEFAULT '{}',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "password_hash" VARCHAR(255),
    "mfa_enabled" BOOLEAN NOT NULL DEFAULT false,
    "mfa_secret" VARCHAR(255),

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "workspaces" (
    "id" UUID NOT NULL DEFAULT uuid_generate_v4(),
    "tenant_id" UUID NOT NULL,
    "name" VARCHAR(255) NOT NULL,
    "slug" VARCHAR(100) NOT NULL,
    "description" TEXT,
    "settings" JSONB NOT NULL DEFAULT '{}',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "workspaces_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "workspace_members" (
    "id" UUID NOT NULL DEFAULT uuid_generate_v4(),
    "workspace_id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "role" "WorkspaceMemberRole" NOT NULL DEFAULT 'MEMBER',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "workspace_members_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "context_graphs" (
    "id" UUID NOT NULL DEFAULT uuid_generate_v4(),
    "tenant_id" UUID NOT NULL,
    "workspace_id" UUID NOT NULL,
    "name" VARCHAR(255) NOT NULL,
    "description" TEXT,
    "is_default" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "version" INTEGER NOT NULL DEFAULT 1,
    "global_version" BIGINT NOT NULL DEFAULT 0,
    "created_by_id" UUID,
    "updated_by_id" UUID,

    CONSTRAINT "context_graphs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "context_nodes" (
    "id" UUID NOT NULL DEFAULT uuid_generate_v4(),
    "tenant_id" UUID NOT NULL,
    "graph_id" UUID NOT NULL,
    "type" "ContextNodeType" NOT NULL,
    "layer" "ContextLayer" NOT NULL,
    "name" VARCHAR(255) NOT NULL,
    "content" TEXT,
    "metadata" JSONB NOT NULL DEFAULT '{}',
    "embedding" vector(1536),
    "freshness" "Freshness" NOT NULL DEFAULT 'CURRENT',
    "validated_at" TIMESTAMP(3),
    "external_url" VARCHAR(2000),
    "external_id" VARCHAR(255),
    "external_sync_at" TIMESTAMP(3),
    "token_count" INTEGER NOT NULL DEFAULT 0,
    "version" INTEGER NOT NULL DEFAULT 1,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "created_by_id" UUID,
    "updated_by_id" UUID,
    "deleted_at" TIMESTAMP(3),
    "deleted_by_id" UUID,

    CONSTRAINT "context_nodes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "context_edges" (
    "id" UUID NOT NULL DEFAULT uuid_generate_v4(),
    "tenant_id" UUID NOT NULL,
    "graph_id" UUID NOT NULL,
    "source_node_id" UUID NOT NULL,
    "target_node_id" UUID NOT NULL,
    "relationship_type" "EdgeType" NOT NULL,
    "metadata" JSONB NOT NULL DEFAULT '{}',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "context_edges_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "slices" (
    "id" UUID NOT NULL DEFAULT uuid_generate_v4(),
    "tenant_id" UUID NOT NULL,
    "workspace_id" UUID NOT NULL,
    "short_id" VARCHAR(20) NOT NULL,
    "name" VARCHAR(255) NOT NULL,
    "outcome" TEXT NOT NULL,
    "anti_scope" TEXT[],
    "status" "SliceStatus" NOT NULL DEFAULT 'PENDING',
    "owner_id" UUID NOT NULL,
    "created_by_id" UUID NOT NULL,
    "started_at" TIMESTAMP(3),
    "submitted_at" TIMESTAMP(3),
    "completed_at" TIMESTAMP(3),
    "archived_at" TIMESTAMP(3),
    "version" INTEGER NOT NULL DEFAULT 1,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "updated_by_id" UUID,
    "deleted_at" TIMESTAMP(3),
    "deleted_by_id" UUID,

    CONSTRAINT "slices_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "slice_constraints" (
    "id" UUID NOT NULL DEFAULT uuid_generate_v4(),
    "slice_id" UUID NOT NULL,
    "content" TEXT NOT NULL,
    "order_index" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "slice_constraints_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "acceptance_criteria" (
    "id" UUID NOT NULL DEFAULT uuid_generate_v4(),
    "slice_id" UUID NOT NULL,
    "content" TEXT NOT NULL,
    "is_completed" BOOLEAN NOT NULL DEFAULT false,
    "completed_at" TIMESTAMP(3),
    "order_index" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "acceptance_criteria_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "slice_context" (
    "id" UUID NOT NULL DEFAULT uuid_generate_v4(),
    "slice_id" UUID NOT NULL,
    "node_id" UUID NOT NULL,
    "is_pinned" BOOLEAN NOT NULL DEFAULT false,
    "added_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "slice_context_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "slice_transitions" (
    "id" UUID NOT NULL DEFAULT uuid_generate_v4(),
    "tenant_id" UUID NOT NULL,
    "slice_id" UUID NOT NULL,
    "from_status" "SliceStatus",
    "to_status" "SliceStatus" NOT NULL,
    "event" VARCHAR(50) NOT NULL,
    "actor_id" UUID NOT NULL,
    "comment" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "slice_transitions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "slice_reviews" (
    "id" UUID NOT NULL DEFAULT uuid_generate_v4(),
    "slice_id" UUID NOT NULL,
    "reviewer_id" UUID NOT NULL,
    "verdict" "ReviewVerdict" NOT NULL,
    "comment" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "slice_reviews_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ai_sessions" (
    "id" UUID NOT NULL DEFAULT uuid_generate_v4(),
    "tenant_id" UUID NOT NULL,
    "workspace_id" UUID NOT NULL,
    "slice_id" UUID,
    "user_id" UUID NOT NULL,
    "context_node_ids" UUID[],
    "context_token_count" INTEGER NOT NULL,
    "context_compiled_at" TIMESTAMP(3) NOT NULL,
    "started_at" TIMESTAMP(3) NOT NULL,
    "ended_at" TIMESTAMP(3),
    "query_hash" VARCHAR(64),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ai_sessions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "session_feedback" (
    "id" UUID NOT NULL DEFAULT uuid_generate_v4(),
    "tenant_id" UUID NOT NULL,
    "session_id" UUID NOT NULL,
    "rating" "FeedbackRating" NOT NULL,
    "error_categories" TEXT[],
    "missing_context" TEXT,
    "comment" TEXT,
    "accuracy_score" INTEGER,
    "completeness_score" INTEGER,
    "style_match_score" INTEGER,
    "review_verdict" "ReviewVerdict",
    "edit_distance" INTEGER,
    "output_issues" TEXT[],
    "submitted_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "submitted_by_id" UUID NOT NULL,

    CONSTRAINT "session_feedback_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "feedback_metrics_daily" (
    "id" UUID NOT NULL DEFAULT uuid_generate_v4(),
    "tenant_id" UUID NOT NULL,
    "workspace_id" UUID NOT NULL,
    "date" DATE NOT NULL,
    "total_sessions" INTEGER NOT NULL DEFAULT 0,
    "positive_ratings" INTEGER NOT NULL DEFAULT 0,
    "negative_ratings" INTEGER NOT NULL DEFAULT 0,
    "skipped_ratings" INTEGER NOT NULL DEFAULT 0,
    "first_pass_acceptance_rate" DOUBLE PRECISION,
    "average_edit_distance" DOUBLE PRECISION,
    "error_category_counts" JSONB NOT NULL DEFAULT '{}',
    "avg_accuracy_score" DOUBLE PRECISION,
    "avg_completeness_score" DOUBLE PRECISION,
    "avg_style_match_score" DOUBLE PRECISION,

    CONSTRAINT "feedback_metrics_daily_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "integrations" (
    "id" UUID NOT NULL DEFAULT uuid_generate_v4(),
    "tenant_id" UUID NOT NULL,
    "workspace_id" UUID NOT NULL,
    "provider" "IntegrationProvider" NOT NULL,
    "name" VARCHAR(255) NOT NULL,
    "credentials" JSONB NOT NULL DEFAULT '{}',
    "sync_config" JSONB NOT NULL DEFAULT '{}',
    "status" "IntegrationStatus" NOT NULL DEFAULT 'PENDING',
    "last_sync_at" TIMESTAMP(3),
    "last_error" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "integrations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "sync_jobs" (
    "id" UUID NOT NULL DEFAULT uuid_generate_v4(),
    "integration_id" UUID NOT NULL,
    "status" "SyncJobStatus" NOT NULL DEFAULT 'PENDING',
    "sync_type" VARCHAR(50) NOT NULL,
    "items_processed" INTEGER NOT NULL DEFAULT 0,
    "items_failed" INTEGER NOT NULL DEFAULT 0,
    "error_log" TEXT,
    "started_at" TIMESTAMP(3),
    "completed_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "sync_jobs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "api_keys" (
    "id" UUID NOT NULL DEFAULT uuid_generate_v4(),
    "user_id" UUID NOT NULL,
    "name" VARCHAR(255) NOT NULL,
    "key_hash" VARCHAR(64) NOT NULL,
    "key_prefix" VARCHAR(10) NOT NULL,
    "permissions" TEXT[],
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "expires_at" TIMESTAMP(3),
    "last_used_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "api_keys_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "audit_logs" (
    "id" UUID NOT NULL DEFAULT uuid_generate_v4(),
    "tenant_id" UUID NOT NULL,
    "timestamp" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "actor_id" VARCHAR(255) NOT NULL,
    "actor_type" VARCHAR(50) NOT NULL,
    "action" VARCHAR(100) NOT NULL,
    "resource_type" VARCHAR(100),
    "resource_id" VARCHAR(255),
    "metadata" JSONB NOT NULL DEFAULT '{}',
    "outcome" VARCHAR(20) NOT NULL,
    "error_code" VARCHAR(50),
    "error_message" TEXT,
    "ip_address" VARCHAR(45),
    "user_agent" VARCHAR(500),

    CONSTRAINT "audit_logs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "context_events" (
    "id" UUID NOT NULL DEFAULT uuid_generate_v4(),
    "tenant_id" UUID NOT NULL,
    "graph_id" UUID NOT NULL,
    "event_type" VARCHAR(100) NOT NULL,
    "entity_type" VARCHAR(50) NOT NULL,
    "entity_id" UUID NOT NULL,
    "version" INTEGER NOT NULL,
    "global_version" BIGINT NOT NULL,
    "vector_clock" JSONB NOT NULL DEFAULT '{}',
    "actor_id" VARCHAR(255) NOT NULL,
    "actor_type" VARCHAR(50) NOT NULL,
    "payload" JSONB NOT NULL,
    "metadata" JSONB NOT NULL DEFAULT '{}',
    "timestamp" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "context_events_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "entity_changes" (
    "id" UUID NOT NULL DEFAULT uuid_generate_v4(),
    "tenant_id" UUID NOT NULL,
    "entity_type" VARCHAR(100) NOT NULL,
    "entity_id" UUID NOT NULL,
    "version" INTEGER NOT NULL,
    "previous_version" INTEGER,
    "change_type" "ChangeType" NOT NULL,
    "changed_fields" TEXT[],
    "previous_values" JSONB,
    "new_values" JSONB NOT NULL,
    "actor_id" VARCHAR(255) NOT NULL,
    "actor_type" VARCHAR(50) NOT NULL,
    "metadata" JSONB NOT NULL DEFAULT '{}',
    "timestamp" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "event_id" UUID,

    CONSTRAINT "entity_changes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "entity_snapshots" (
    "id" UUID NOT NULL DEFAULT uuid_generate_v4(),
    "tenant_id" UUID NOT NULL,
    "entity_type" VARCHAR(100) NOT NULL,
    "entity_id" UUID NOT NULL,
    "version" INTEGER NOT NULL,
    "snapshot" JSONB NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "entity_snapshots_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "entity_drafts" (
    "id" UUID NOT NULL DEFAULT uuid_generate_v4(),
    "tenant_id" UUID NOT NULL,
    "entity_type" VARCHAR(100) NOT NULL,
    "entity_id" UUID NOT NULL,
    "base_version" INTEGER NOT NULL,
    "draft_content" JSONB NOT NULL,
    "changed_fields" TEXT[],
    "name" VARCHAR(255),
    "created_by_id" UUID NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "expires_at" TIMESTAMP(3),

    CONSTRAINT "entity_drafts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "entity_versions" (
    "id" UUID NOT NULL DEFAULT uuid_generate_v4(),
    "tenant_id" UUID NOT NULL,
    "entity_type" VARCHAR(50) NOT NULL,
    "entity_id" UUID NOT NULL,
    "version" INTEGER NOT NULL DEFAULT 1,
    "vector_clock" JSONB NOT NULL DEFAULT '{}',
    "last_event_id" UUID,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "entity_versions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "context_subscriptions" (
    "id" UUID NOT NULL DEFAULT uuid_generate_v4(),
    "tenant_id" UUID NOT NULL,
    "client_id" VARCHAR(255) NOT NULL,
    "product" VARCHAR(50) NOT NULL,
    "product_version" VARCHAR(50) NOT NULL,
    "scopes" JSONB NOT NULL,
    "filters" JSONB,
    "options" JSONB NOT NULL,
    "last_version" BIGINT,
    "last_ack_at" TIMESTAMP(3),
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expires_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "context_subscriptions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "pending_deliveries" (
    "id" UUID NOT NULL DEFAULT uuid_generate_v4(),
    "subscription_id" UUID NOT NULL,
    "event_id" UUID NOT NULL,
    "payload" JSONB NOT NULL,
    "attempts" INTEGER NOT NULL DEFAULT 0,
    "last_attempt_at" TIMESTAMP(3),
    "next_attempt_at" TIMESTAMP(3) NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "pending_deliveries_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "tenant_versions" (
    "id" UUID NOT NULL DEFAULT uuid_generate_v4(),
    "tenant_id" UUID NOT NULL,
    "global_version" BIGINT NOT NULL DEFAULT 0,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "tenant_versions_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "tenants_slug_key" ON "tenants"("slug");

-- CreateIndex
CREATE INDEX "users_tenant_id_idx" ON "users"("tenant_id");

-- CreateIndex
CREATE UNIQUE INDEX "users_tenant_id_email_key" ON "users"("tenant_id", "email");

-- CreateIndex
CREATE INDEX "workspaces_tenant_id_idx" ON "workspaces"("tenant_id");

-- CreateIndex
CREATE UNIQUE INDEX "workspaces_tenant_id_slug_key" ON "workspaces"("tenant_id", "slug");

-- CreateIndex
CREATE UNIQUE INDEX "workspace_members_workspace_id_user_id_key" ON "workspace_members"("workspace_id", "user_id");

-- CreateIndex
CREATE INDEX "context_graphs_tenant_id_idx" ON "context_graphs"("tenant_id");

-- CreateIndex
CREATE INDEX "context_graphs_workspace_id_idx" ON "context_graphs"("workspace_id");

-- CreateIndex
CREATE INDEX "context_graphs_tenant_id_version_idx" ON "context_graphs"("tenant_id", "version");

-- CreateIndex
CREATE INDEX "context_nodes_tenant_id_idx" ON "context_nodes"("tenant_id");

-- CreateIndex
CREATE INDEX "context_nodes_graph_id_idx" ON "context_nodes"("graph_id");

-- CreateIndex
CREATE INDEX "context_nodes_type_idx" ON "context_nodes"("type");

-- CreateIndex
CREATE INDEX "context_nodes_layer_idx" ON "context_nodes"("layer");

-- CreateIndex
CREATE INDEX "context_nodes_freshness_idx" ON "context_nodes"("freshness");

-- CreateIndex
CREATE INDEX "context_nodes_tenant_id_version_idx" ON "context_nodes"("tenant_id", "version");

-- CreateIndex
CREATE INDEX "context_nodes_deleted_at_idx" ON "context_nodes"("deleted_at");

-- CreateIndex
CREATE INDEX "context_edges_graph_id_idx" ON "context_edges"("graph_id");

-- CreateIndex
CREATE INDEX "context_edges_source_node_id_idx" ON "context_edges"("source_node_id");

-- CreateIndex
CREATE INDEX "context_edges_target_node_id_idx" ON "context_edges"("target_node_id");

-- CreateIndex
CREATE INDEX "slices_tenant_id_idx" ON "slices"("tenant_id");

-- CreateIndex
CREATE INDEX "slices_workspace_id_idx" ON "slices"("workspace_id");

-- CreateIndex
CREATE INDEX "slices_status_idx" ON "slices"("status");

-- CreateIndex
CREATE INDEX "slices_owner_id_idx" ON "slices"("owner_id");

-- CreateIndex
CREATE INDEX "slices_tenant_id_version_idx" ON "slices"("tenant_id", "version");

-- CreateIndex
CREATE INDEX "slices_deleted_at_idx" ON "slices"("deleted_at");

-- CreateIndex
CREATE UNIQUE INDEX "slices_tenant_id_short_id_key" ON "slices"("tenant_id", "short_id");

-- CreateIndex
CREATE INDEX "slice_constraints_slice_id_idx" ON "slice_constraints"("slice_id");

-- CreateIndex
CREATE INDEX "acceptance_criteria_slice_id_idx" ON "acceptance_criteria"("slice_id");

-- CreateIndex
CREATE UNIQUE INDEX "slice_context_slice_id_node_id_key" ON "slice_context"("slice_id", "node_id");

-- CreateIndex
CREATE INDEX "slice_transitions_slice_id_idx" ON "slice_transitions"("slice_id");

-- CreateIndex
CREATE INDEX "slice_transitions_tenant_id_idx" ON "slice_transitions"("tenant_id");

-- CreateIndex
CREATE INDEX "slice_reviews_slice_id_idx" ON "slice_reviews"("slice_id");

-- CreateIndex
CREATE INDEX "ai_sessions_tenant_id_idx" ON "ai_sessions"("tenant_id");

-- CreateIndex
CREATE INDEX "ai_sessions_workspace_id_idx" ON "ai_sessions"("workspace_id");

-- CreateIndex
CREATE INDEX "ai_sessions_slice_id_idx" ON "ai_sessions"("slice_id");

-- CreateIndex
CREATE INDEX "ai_sessions_user_id_idx" ON "ai_sessions"("user_id");

-- CreateIndex
CREATE INDEX "ai_sessions_started_at_idx" ON "ai_sessions"("started_at");

-- CreateIndex
CREATE UNIQUE INDEX "session_feedback_session_id_key" ON "session_feedback"("session_id");

-- CreateIndex
CREATE INDEX "session_feedback_tenant_id_idx" ON "session_feedback"("tenant_id");

-- CreateIndex
CREATE INDEX "session_feedback_rating_idx" ON "session_feedback"("rating");

-- CreateIndex
CREATE INDEX "session_feedback_submitted_at_idx" ON "session_feedback"("submitted_at");

-- CreateIndex
CREATE INDEX "feedback_metrics_daily_tenant_id_idx" ON "feedback_metrics_daily"("tenant_id");

-- CreateIndex
CREATE INDEX "feedback_metrics_daily_workspace_id_idx" ON "feedback_metrics_daily"("workspace_id");

-- CreateIndex
CREATE INDEX "feedback_metrics_daily_date_idx" ON "feedback_metrics_daily"("date");

-- CreateIndex
CREATE UNIQUE INDEX "feedback_metrics_daily_tenant_id_workspace_id_date_key" ON "feedback_metrics_daily"("tenant_id", "workspace_id", "date");

-- CreateIndex
CREATE INDEX "integrations_tenant_id_idx" ON "integrations"("tenant_id");

-- CreateIndex
CREATE UNIQUE INDEX "integrations_workspace_id_provider_key" ON "integrations"("workspace_id", "provider");

-- CreateIndex
CREATE INDEX "sync_jobs_integration_id_idx" ON "sync_jobs"("integration_id");

-- CreateIndex
CREATE INDEX "sync_jobs_status_idx" ON "sync_jobs"("status");

-- CreateIndex
CREATE UNIQUE INDEX "api_keys_key_hash_key" ON "api_keys"("key_hash");

-- CreateIndex
CREATE INDEX "api_keys_user_id_idx" ON "api_keys"("user_id");

-- CreateIndex
CREATE INDEX "api_keys_key_hash_idx" ON "api_keys"("key_hash");

-- CreateIndex
CREATE INDEX "audit_logs_tenant_id_idx" ON "audit_logs"("tenant_id");

-- CreateIndex
CREATE INDEX "audit_logs_timestamp_idx" ON "audit_logs"("timestamp");

-- CreateIndex
CREATE INDEX "audit_logs_actor_id_idx" ON "audit_logs"("actor_id");

-- CreateIndex
CREATE INDEX "audit_logs_action_idx" ON "audit_logs"("action");

-- CreateIndex
CREATE INDEX "audit_logs_resource_type_resource_id_idx" ON "audit_logs"("resource_type", "resource_id");

-- CreateIndex
CREATE INDEX "context_events_tenant_id_global_version_idx" ON "context_events"("tenant_id", "global_version");

-- CreateIndex
CREATE INDEX "context_events_tenant_id_graph_id_entity_type_entity_id_idx" ON "context_events"("tenant_id", "graph_id", "entity_type", "entity_id");

-- CreateIndex
CREATE INDEX "context_events_tenant_id_timestamp_idx" ON "context_events"("tenant_id", "timestamp");

-- CreateIndex
CREATE INDEX "context_events_graph_id_idx" ON "context_events"("graph_id");

-- CreateIndex
CREATE INDEX "entity_changes_tenant_id_entity_type_entity_id_idx" ON "entity_changes"("tenant_id", "entity_type", "entity_id");

-- CreateIndex
CREATE INDEX "entity_changes_tenant_id_timestamp_idx" ON "entity_changes"("tenant_id", "timestamp");

-- CreateIndex
CREATE INDEX "entity_changes_tenant_id_version_idx" ON "entity_changes"("tenant_id", "version");

-- CreateIndex
CREATE INDEX "entity_changes_event_id_idx" ON "entity_changes"("event_id");

-- CreateIndex
CREATE INDEX "entity_snapshots_tenant_id_entity_type_entity_id_idx" ON "entity_snapshots"("tenant_id", "entity_type", "entity_id");

-- CreateIndex
CREATE UNIQUE INDEX "entity_snapshots_tenant_id_entity_type_entity_id_version_key" ON "entity_snapshots"("tenant_id", "entity_type", "entity_id", "version");

-- CreateIndex
CREATE INDEX "entity_drafts_tenant_id_created_by_id_idx" ON "entity_drafts"("tenant_id", "created_by_id");

-- CreateIndex
CREATE INDEX "entity_drafts_expires_at_idx" ON "entity_drafts"("expires_at");

-- CreateIndex
CREATE UNIQUE INDEX "entity_drafts_tenant_id_entity_type_entity_id_created_by_id_key" ON "entity_drafts"("tenant_id", "entity_type", "entity_id", "created_by_id");

-- CreateIndex
CREATE UNIQUE INDEX "entity_versions_tenant_id_entity_type_entity_id_key" ON "entity_versions"("tenant_id", "entity_type", "entity_id");

-- CreateIndex
CREATE INDEX "context_subscriptions_tenant_id_client_id_idx" ON "context_subscriptions"("tenant_id", "client_id");

-- CreateIndex
CREATE INDEX "context_subscriptions_tenant_id_product_idx" ON "context_subscriptions"("tenant_id", "product");

-- CreateIndex
CREATE INDEX "context_subscriptions_is_active_idx" ON "context_subscriptions"("is_active");

-- CreateIndex
CREATE INDEX "context_subscriptions_expires_at_idx" ON "context_subscriptions"("expires_at");

-- CreateIndex
CREATE INDEX "pending_deliveries_subscription_id_idx" ON "pending_deliveries"("subscription_id");

-- CreateIndex
CREATE INDEX "pending_deliveries_next_attempt_at_idx" ON "pending_deliveries"("next_attempt_at");

-- CreateIndex
CREATE UNIQUE INDEX "tenant_versions_tenant_id_key" ON "tenant_versions"("tenant_id");

-- AddForeignKey
ALTER TABLE "users" ADD CONSTRAINT "users_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "workspaces" ADD CONSTRAINT "workspaces_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "workspace_members" ADD CONSTRAINT "workspace_members_workspace_id_fkey" FOREIGN KEY ("workspace_id") REFERENCES "workspaces"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "workspace_members" ADD CONSTRAINT "workspace_members_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "context_graphs" ADD CONSTRAINT "context_graphs_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "context_graphs" ADD CONSTRAINT "context_graphs_workspace_id_fkey" FOREIGN KEY ("workspace_id") REFERENCES "workspaces"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "context_nodes" ADD CONSTRAINT "context_nodes_graph_id_fkey" FOREIGN KEY ("graph_id") REFERENCES "context_graphs"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "context_nodes" ADD CONSTRAINT "context_nodes_created_by_id_fkey" FOREIGN KEY ("created_by_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "context_edges" ADD CONSTRAINT "context_edges_graph_id_fkey" FOREIGN KEY ("graph_id") REFERENCES "context_graphs"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "context_edges" ADD CONSTRAINT "context_edges_source_node_id_fkey" FOREIGN KEY ("source_node_id") REFERENCES "context_nodes"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "context_edges" ADD CONSTRAINT "context_edges_target_node_id_fkey" FOREIGN KEY ("target_node_id") REFERENCES "context_nodes"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "slices" ADD CONSTRAINT "slices_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "slices" ADD CONSTRAINT "slices_workspace_id_fkey" FOREIGN KEY ("workspace_id") REFERENCES "workspaces"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "slices" ADD CONSTRAINT "slices_owner_id_fkey" FOREIGN KEY ("owner_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "slices" ADD CONSTRAINT "slices_created_by_id_fkey" FOREIGN KEY ("created_by_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "slice_constraints" ADD CONSTRAINT "slice_constraints_slice_id_fkey" FOREIGN KEY ("slice_id") REFERENCES "slices"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "acceptance_criteria" ADD CONSTRAINT "acceptance_criteria_slice_id_fkey" FOREIGN KEY ("slice_id") REFERENCES "slices"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "slice_context" ADD CONSTRAINT "slice_context_slice_id_fkey" FOREIGN KEY ("slice_id") REFERENCES "slices"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "slice_context" ADD CONSTRAINT "slice_context_node_id_fkey" FOREIGN KEY ("node_id") REFERENCES "context_nodes"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "slice_transitions" ADD CONSTRAINT "slice_transitions_slice_id_fkey" FOREIGN KEY ("slice_id") REFERENCES "slices"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "slice_reviews" ADD CONSTRAINT "slice_reviews_slice_id_fkey" FOREIGN KEY ("slice_id") REFERENCES "slices"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "slice_reviews" ADD CONSTRAINT "slice_reviews_reviewer_id_fkey" FOREIGN KEY ("reviewer_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ai_sessions" ADD CONSTRAINT "ai_sessions_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ai_sessions" ADD CONSTRAINT "ai_sessions_workspace_id_fkey" FOREIGN KEY ("workspace_id") REFERENCES "workspaces"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ai_sessions" ADD CONSTRAINT "ai_sessions_slice_id_fkey" FOREIGN KEY ("slice_id") REFERENCES "slices"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ai_sessions" ADD CONSTRAINT "ai_sessions_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "session_feedback" ADD CONSTRAINT "session_feedback_session_id_fkey" FOREIGN KEY ("session_id") REFERENCES "ai_sessions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "session_feedback" ADD CONSTRAINT "session_feedback_submitted_by_id_fkey" FOREIGN KEY ("submitted_by_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "feedback_metrics_daily" ADD CONSTRAINT "feedback_metrics_daily_workspace_id_fkey" FOREIGN KEY ("workspace_id") REFERENCES "workspaces"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "integrations" ADD CONSTRAINT "integrations_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "integrations" ADD CONSTRAINT "integrations_workspace_id_fkey" FOREIGN KEY ("workspace_id") REFERENCES "workspaces"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sync_jobs" ADD CONSTRAINT "sync_jobs_integration_id_fkey" FOREIGN KEY ("integration_id") REFERENCES "integrations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "api_keys" ADD CONSTRAINT "api_keys_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "context_events" ADD CONSTRAINT "context_events_graph_id_fkey" FOREIGN KEY ("graph_id") REFERENCES "context_graphs"("id") ON DELETE CASCADE ON UPDATE CASCADE;
