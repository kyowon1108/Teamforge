-- CreateExtension
CREATE EXTENSION IF NOT EXISTS "vector";

-- CreateTable
CREATE TABLE "users" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "email" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "avatar_url" TEXT,
    "github_url" TEXT,
    "role" TEXT NOT NULL DEFAULT 'member',
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "deleted_at" TIMESTAMPTZ,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "auth_accounts" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "user_id" UUID NOT NULL,
    "provider" VARCHAR(20) NOT NULL,
    "provider_id" VARCHAR(255) NOT NULL,
    "access_token" TEXT,
    "refresh_token" TEXT,
    "expires_at" TIMESTAMPTZ,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "auth_accounts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "teams" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "name" TEXT NOT NULL,
    "description" TEXT,
    "invite_code" VARCHAR(10) NOT NULL,
    "invite_expires_at" TIMESTAMPTZ,
    "expected_size" INTEGER NOT NULL DEFAULT 4,
    "status" TEXT NOT NULL DEFAULT 'active',
    "leader_user_id" UUID NOT NULL,
    "selected_stack" JSONB,
    "sprint_config" JSONB,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "deleted_at" TIMESTAMPTZ,

    CONSTRAINT "teams_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "team_members" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "team_id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "role" TEXT NOT NULL DEFAULT 'member',
    "status" TEXT NOT NULL DEFAULT 'active',
    "joined_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "left_at" TIMESTAMPTZ,
    "updated_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "team_members_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "skill_assessments" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "user_id" UUID NOT NULL,
    "team_id" UUID NOT NULL,
    "answers" JSONB,
    "skill_vector" vector(6),
    "experience_score" DOUBLE PRECISION,
    "reliability_score" DOUBLE PRECISION,
    "resume_data" JSONB,
    "github_data" JSONB,
    "status" TEXT NOT NULL DEFAULT 'draft',
    "submitted_at" TIMESTAMPTZ,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "skill_assessments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "uploads" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "user_id" UUID NOT NULL,
    "team_id" UUID,
    "upload_type" VARCHAR(20) NOT NULL,
    "storage_path" VARCHAR(500) NOT NULL,
    "mime_type" VARCHAR(100),
    "size_bytes" INTEGER,
    "parsed" BOOLEAN NOT NULL DEFAULT false,
    "delete_at" TIMESTAMPTZ,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "uploads_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "meetings" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "team_id" UUID NOT NULL,
    "title" VARCHAR(200),
    "input_type" VARCHAR(20) NOT NULL DEFAULT 'text',
    "raw_content" TEXT,
    "summary" TEXT,
    "next_agenda" JSONB,
    "analysis_status" TEXT NOT NULL DEFAULT 'pending',
    "created_by" UUID NOT NULL,
    "meeting_date" TIMESTAMPTZ NOT NULL,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "meetings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "action_items" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "meeting_id" UUID NOT NULL,
    "team_id" UUID NOT NULL,
    "description" TEXT NOT NULL,
    "assignee_name" VARCHAR(100),
    "assignee_id" UUID,
    "due_date" DATE,
    "status" TEXT NOT NULL DEFAULT 'open',
    "completed_at" TIMESTAMPTZ,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "action_items_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "event_logs" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "team_id" UUID,
    "user_id" UUID,
    "event" VARCHAR(50) NOT NULL,
    "metadata" JSONB,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "event_logs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "kickoff_sessions" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "team_id" UUID NOT NULL,
    "phase" TEXT NOT NULL DEFAULT 'topic_decision',
    "topic_decided" BOOLEAN NOT NULL DEFAULT false,
    "topic_title" VARCHAR(200),
    "topic_description" TEXT,
    "platform_type" VARCHAR(50),
    "features" JSONB,
    "complexity" VARCHAR(20),
    "architecture" JSONB,
    "mermaid_diagram" TEXT,
    "summary_confirmed" BOOLEAN NOT NULL DEFAULT false,
    "out_of_scope" JSONB,
    "success_criteria" JSONB,
    "collab_rules" JSONB,
    "revision" INTEGER NOT NULL DEFAULT 0,
    "generation_status" TEXT NOT NULL DEFAULT 'idle',
    "generation_requested_at" TIMESTAMPTZ,
    "generation_completed_at" TIMESTAMPTZ,
    "started_by" UUID NOT NULL,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "kickoff_sessions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "kickoff_participants" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "session_id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "concerns" JSONB,
    "role_acceptance_status" TEXT NOT NULL DEFAULT 'pending',
    "alternative_role" VARCHAR(100),
    "signed_at" TIMESTAMPTZ,
    "signed_revision" INTEGER,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "kickoff_participants_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "kickoff_artifacts" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "session_id" UUID NOT NULL,
    "artifact_type" VARCHAR(30) NOT NULL,
    "content" JSONB NOT NULL,
    "session_revision" INTEGER NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'draft',
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "kickoff_artifacts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "kickoff_messages" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "session_id" UUID NOT NULL,
    "role" VARCHAR(20) NOT NULL,
    "content" TEXT NOT NULL,
    "mermaid_code" TEXT,
    "phase" VARCHAR(30) NOT NULL,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "kickoff_messages_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ai_run_logs" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "team_id" UUID,
    "agent_id" SMALLINT NOT NULL,
    "model" VARCHAR(50) NOT NULL,
    "input_tokens" INTEGER,
    "output_tokens" INTEGER,
    "cost_usd" DECIMAL(10,6),
    "duration_ms" INTEGER,
    "success" BOOLEAN,
    "error_code" VARCHAR(50),
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ai_run_logs_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");

-- CreateIndex
CREATE INDEX "auth_accounts_user_id_idx" ON "auth_accounts"("user_id");

-- CreateIndex
CREATE UNIQUE INDEX "auth_accounts_provider_provider_id_key" ON "auth_accounts"("provider", "provider_id");

-- CreateIndex
CREATE UNIQUE INDEX "teams_invite_code_key" ON "teams"("invite_code");

-- CreateIndex
CREATE UNIQUE INDEX "team_members_team_id_user_id_key" ON "team_members"("team_id", "user_id");

-- CreateIndex
CREATE INDEX "skill_assessments_team_id_idx" ON "skill_assessments"("team_id");

-- CreateIndex
CREATE UNIQUE INDEX "skill_assessments_user_id_team_id_key" ON "skill_assessments"("user_id", "team_id");

-- CreateIndex
CREATE INDEX "uploads_team_id_user_id_idx" ON "uploads"("team_id", "user_id");

-- CreateIndex
CREATE INDEX "meetings_team_id_meeting_date_idx" ON "meetings"("team_id", "meeting_date");

-- CreateIndex
CREATE INDEX "action_items_team_id_status_idx" ON "action_items"("team_id", "status");

-- CreateIndex
CREATE INDEX "event_logs_event_created_at_idx" ON "event_logs"("event", "created_at");

-- CreateIndex
CREATE INDEX "event_logs_team_id_event_idx" ON "event_logs"("team_id", "event");

-- CreateIndex
CREATE UNIQUE INDEX "kickoff_sessions_team_id_key" ON "kickoff_sessions"("team_id");

-- CreateIndex
CREATE INDEX "kickoff_participants_session_id_idx" ON "kickoff_participants"("session_id");

-- CreateIndex
CREATE UNIQUE INDEX "kickoff_participants_session_id_user_id_key" ON "kickoff_participants"("session_id", "user_id");

-- CreateIndex
CREATE INDEX "kickoff_artifacts_session_id_artifact_type_idx" ON "kickoff_artifacts"("session_id", "artifact_type");

-- CreateIndex
CREATE INDEX "kickoff_messages_session_id_created_at_idx" ON "kickoff_messages"("session_id", "created_at");

-- CreateIndex
CREATE INDEX "ai_run_logs_team_id_created_at_idx" ON "ai_run_logs"("team_id", "created_at");

-- AddForeignKey
ALTER TABLE "auth_accounts" ADD CONSTRAINT "auth_accounts_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "team_members" ADD CONSTRAINT "team_members_team_id_fkey" FOREIGN KEY ("team_id") REFERENCES "teams"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "team_members" ADD CONSTRAINT "team_members_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "skill_assessments" ADD CONSTRAINT "skill_assessments_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "skill_assessments" ADD CONSTRAINT "skill_assessments_team_id_fkey" FOREIGN KEY ("team_id") REFERENCES "teams"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "uploads" ADD CONSTRAINT "uploads_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "uploads" ADD CONSTRAINT "uploads_team_id_fkey" FOREIGN KEY ("team_id") REFERENCES "teams"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "meetings" ADD CONSTRAINT "meetings_team_id_fkey" FOREIGN KEY ("team_id") REFERENCES "teams"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "action_items" ADD CONSTRAINT "action_items_meeting_id_fkey" FOREIGN KEY ("meeting_id") REFERENCES "meetings"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "kickoff_sessions" ADD CONSTRAINT "kickoff_sessions_team_id_fkey" FOREIGN KEY ("team_id") REFERENCES "teams"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "kickoff_participants" ADD CONSTRAINT "kickoff_participants_session_id_fkey" FOREIGN KEY ("session_id") REFERENCES "kickoff_sessions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "kickoff_participants" ADD CONSTRAINT "kickoff_participants_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "kickoff_artifacts" ADD CONSTRAINT "kickoff_artifacts_session_id_fkey" FOREIGN KEY ("session_id") REFERENCES "kickoff_sessions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "kickoff_messages" ADD CONSTRAINT "kickoff_messages_session_id_fkey" FOREIGN KEY ("session_id") REFERENCES "kickoff_sessions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ai_run_logs" ADD CONSTRAINT "ai_run_logs_team_id_fkey" FOREIGN KEY ("team_id") REFERENCES "teams"("id") ON DELETE SET NULL ON UPDATE CASCADE;
