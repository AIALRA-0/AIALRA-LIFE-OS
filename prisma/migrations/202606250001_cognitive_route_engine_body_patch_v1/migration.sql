-- CreateEnum
CREATE TYPE "RouteStatus" AS ENUM ('ACTIVE', 'PAUSED', 'COMPLETED');

-- CreateEnum
CREATE TYPE "RouteStageMode" AS ENUM ('SERIAL', 'PARALLEL');

-- CreateEnum
CREATE TYPE "FixedSlotType" AS ENUM ('ANCHOR', 'FIXED_ROUTE', 'PARALLEL_ROUTE', 'COURSE_SLOT', 'OPEN_AGENT_SLOT', 'ART_SLOT', 'MEAL', 'SHUTDOWN', 'BODY_ACTIVATION', 'MOVEMENT_TRAINING');

-- CreateEnum
CREATE TYPE "OpenAgentSlotSource" AS ENUM ('USER_CONFLICT', 'AGENT_REPAIR', 'COURSE_OVERFLOW', 'LIFE_ADMIN', 'NETWORKING', 'CODEX_REVIEW');

-- CreateEnum
CREATE TYPE "CodexSidecarStatus" AS ENUM ('QUEUED', 'RUNNING', 'DONE', 'FAILED', 'REVIEWED');

-- CreateEnum
CREATE TYPE "BodyCheckinType" AS ENUM ('BODY_ACTIVATION', 'MOVEMENT_TRAINING', 'DIET', 'GENERAL');

-- AlterTable
ALTER TABLE "AgentRun" ADD COLUMN     "promptVersion" TEXT,
ADD COLUMN     "providerToolResultJson" JSONB,
ADD COLUMN     "replayInputJson" JSONB,
ADD COLUMN     "traceJson" JSONB;

-- AlterTable
ALTER TABLE "DailyPlan" ADD COLUMN     "routeSnapshotJson" JSONB;

-- AlterTable
ALTER TABLE "ExecutionLog" ADD COLUMN     "actualMinutes" INTEGER,
ADD COLUMN     "distractionLevel" INTEGER,
ADD COLUMN     "painOrFatigue" INTEGER;

-- AlterTable
ALTER TABLE "PlanBlock" ADD COLUMN     "courseSlotId" TEXT,
ADD COLUMN     "fixedSlotTemplateId" TEXT,
ADD COLUMN     "flexible" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "openAgentSlotId" TEXT,
ADD COLUMN     "protected" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "repairReason" TEXT,
ADD COLUMN     "routeId" TEXT,
ADD COLUMN     "routeStageId" TEXT,
ADD COLUMN     "routeTopic" TEXT,
ADD COLUMN     "routeWeekId" TEXT,
ADD COLUMN     "slotSource" TEXT;

-- CreateTable
CREATE TABLE "CognitiveRoute" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "domain" TEXT NOT NULL,
    "status" "RouteStatus" NOT NULL DEFAULT 'ACTIVE',
    "startDate" TIMESTAMP(3) NOT NULL,
    "endDate" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CognitiveRoute_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RouteStage" (
    "id" TEXT NOT NULL,
    "routeId" TEXT NOT NULL,
    "order" INTEGER NOT NULL,
    "name" TEXT NOT NULL,
    "weeks" INTEGER NOT NULL,
    "objective" TEXT NOT NULL,
    "completionStandard" TEXT NOT NULL,
    "serialOrParallel" "RouteStageMode" NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "RouteStage_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RouteWeek" (
    "id" TEXT NOT NULL,
    "routeId" TEXT NOT NULL,
    "stageId" TEXT NOT NULL,
    "weekIndex" INTEGER NOT NULL,
    "title" TEXT NOT NULL,
    "theme" TEXT NOT NULL,
    "concreteTopics" JSONB NOT NULL,
    "primaryResources" JSONB NOT NULL,
    "expectedEvidence" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "RouteWeek_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "FixedTimeSlotTemplate" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "dayOfWeek" INTEGER,
    "startTime" TEXT NOT NULL,
    "endTime" TEXT NOT NULL,
    "slotType" "FixedSlotType" NOT NULL,
    "title" TEXT NOT NULL,
    "routeDomain" TEXT,
    "protected" BOOLEAN NOT NULL DEFAULT false,
    "flexible" BOOLEAN NOT NULL DEFAULT true,
    "defaultRule" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "FixedTimeSlotTemplate_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CourseSlot" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "courseName" TEXT NOT NULL,
    "courseCode" TEXT NOT NULL,
    "instructor" TEXT,
    "dayOfWeek" INTEGER NOT NULL,
    "startTime" TEXT NOT NULL,
    "endTime" TEXT NOT NULL,
    "location" TEXT,
    "term" TEXT,
    "source" TEXT,
    "locked" BOOLEAN NOT NULL DEFAULT true,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CourseSlot_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "OpenAgentSlot" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "date" TIMESTAMP(3) NOT NULL,
    "startTime" TEXT NOT NULL,
    "endTime" TEXT NOT NULL,
    "insertedTitle" TEXT NOT NULL,
    "reason" TEXT NOT NULL,
    "source" "OpenAgentSlotSource" NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "OpenAgentSlot_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RouteEvidenceNode" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "skillNodeId" TEXT,
    "routeId" TEXT NOT NULL,
    "stageId" TEXT,
    "routeWeekId" TEXT,
    "name" TEXT NOT NULL,
    "domain" TEXT NOT NULL,
    "track" TEXT NOT NULL,
    "currentLevel" INTEGER NOT NULL DEFAULT 0,
    "nextGate" TEXT NOT NULL,
    "requiredArtifact" TEXT NOT NULL,
    "linkedResourceUrls" JSONB NOT NULL,
    "confidence" INTEGER NOT NULL DEFAULT 0,
    "lastEvidenceAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "RouteEvidenceNode_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CodexSidecarTask" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "planBlockId" TEXT,
    "routeWeekId" TEXT,
    "title" TEXT NOT NULL,
    "prompt" TEXT NOT NULL,
    "status" "CodexSidecarStatus" NOT NULL DEFAULT 'QUEUED',
    "repoUrl" TEXT,
    "outputSummary" TEXT,
    "artifactUrl" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CodexSidecarTask_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BodyCheckin" (
    "id" TEXT NOT NULL,
    "executionLogId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "planBlockId" TEXT,
    "checkinType" "BodyCheckinType" NOT NULL DEFAULT 'GENERAL',
    "painBefore" INTEGER,
    "painAfter" INTEGER,
    "stiffnessBefore" INTEGER,
    "stiffnessAfter" INTEGER,
    "hipTightness" INTEGER,
    "neckShoulderTension" INTEGER,
    "lumbarSignal" INTEGER,
    "activationCompleted" BOOLEAN,
    "trainingType" TEXT,
    "durationMinutes" INTEGER,
    "distanceOrSteps" TEXT,
    "setsCompleted" JSONB,
    "rpe" INTEGER,
    "fatigueAfter" INTEGER,
    "zone2Completed" BOOLEAN,
    "strengthCompleted" BOOLEAN,
    "mobilityCompleted" BOOLEAN,
    "evidenceText" TEXT,
    "evidenceUrl" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "BodyCheckin_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "CognitiveRoute_userId_status_domain_idx" ON "CognitiveRoute"("userId", "status", "domain");

-- CreateIndex
CREATE UNIQUE INDEX "CognitiveRoute_userId_name_key" ON "CognitiveRoute"("userId", "name");

-- CreateIndex
CREATE UNIQUE INDEX "RouteStage_routeId_order_key" ON "RouteStage"("routeId", "order");

-- CreateIndex
CREATE INDEX "RouteWeek_stageId_idx" ON "RouteWeek"("stageId");

-- CreateIndex
CREATE UNIQUE INDEX "RouteWeek_routeId_weekIndex_key" ON "RouteWeek"("routeId", "weekIndex");

-- CreateIndex
CREATE INDEX "FixedTimeSlotTemplate_userId_slotType_idx" ON "FixedTimeSlotTemplate"("userId", "slotType");

-- CreateIndex
CREATE UNIQUE INDEX "FixedTimeSlotTemplate_userId_dayOfWeek_startTime_endTime_key" ON "FixedTimeSlotTemplate"("userId", "dayOfWeek", "startTime", "endTime");

-- CreateIndex
CREATE INDEX "CourseSlot_userId_active_dayOfWeek_idx" ON "CourseSlot"("userId", "active", "dayOfWeek");

-- CreateIndex
CREATE INDEX "OpenAgentSlot_userId_date_idx" ON "OpenAgentSlot"("userId", "date");

-- CreateIndex
CREATE INDEX "RouteEvidenceNode_userId_domain_track_idx" ON "RouteEvidenceNode"("userId", "domain", "track");

-- CreateIndex
CREATE UNIQUE INDEX "RouteEvidenceNode_userId_routeId_track_name_key" ON "RouteEvidenceNode"("userId", "routeId", "track", "name");

-- CreateIndex
CREATE INDEX "CodexSidecarTask_userId_status_idx" ON "CodexSidecarTask"("userId", "status");

-- CreateIndex
CREATE INDEX "CodexSidecarTask_planBlockId_idx" ON "CodexSidecarTask"("planBlockId");

-- CreateIndex
CREATE UNIQUE INDEX "BodyCheckin_executionLogId_key" ON "BodyCheckin"("executionLogId");

-- CreateIndex
CREATE INDEX "BodyCheckin_userId_checkinType_idx" ON "BodyCheckin"("userId", "checkinType");

-- CreateIndex
CREATE INDEX "BodyCheckin_planBlockId_idx" ON "BodyCheckin"("planBlockId");

-- CreateIndex
CREATE INDEX "PlanBlock_routeId_idx" ON "PlanBlock"("routeId");

-- CreateIndex
CREATE INDEX "PlanBlock_routeWeekId_idx" ON "PlanBlock"("routeWeekId");

-- CreateIndex
CREATE INDEX "PlanBlock_courseSlotId_idx" ON "PlanBlock"("courseSlotId");

-- CreateIndex
CREATE INDEX "PlanBlock_openAgentSlotId_idx" ON "PlanBlock"("openAgentSlotId");

-- AddForeignKey
ALTER TABLE "PlanBlock" ADD CONSTRAINT "PlanBlock_routeId_fkey" FOREIGN KEY ("routeId") REFERENCES "CognitiveRoute"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PlanBlock" ADD CONSTRAINT "PlanBlock_routeStageId_fkey" FOREIGN KEY ("routeStageId") REFERENCES "RouteStage"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PlanBlock" ADD CONSTRAINT "PlanBlock_routeWeekId_fkey" FOREIGN KEY ("routeWeekId") REFERENCES "RouteWeek"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PlanBlock" ADD CONSTRAINT "PlanBlock_fixedSlotTemplateId_fkey" FOREIGN KEY ("fixedSlotTemplateId") REFERENCES "FixedTimeSlotTemplate"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PlanBlock" ADD CONSTRAINT "PlanBlock_courseSlotId_fkey" FOREIGN KEY ("courseSlotId") REFERENCES "CourseSlot"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PlanBlock" ADD CONSTRAINT "PlanBlock_openAgentSlotId_fkey" FOREIGN KEY ("openAgentSlotId") REFERENCES "OpenAgentSlot"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CognitiveRoute" ADD CONSTRAINT "CognitiveRoute_userId_fkey" FOREIGN KEY ("userId") REFERENCES "UserProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RouteStage" ADD CONSTRAINT "RouteStage_routeId_fkey" FOREIGN KEY ("routeId") REFERENCES "CognitiveRoute"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RouteWeek" ADD CONSTRAINT "RouteWeek_routeId_fkey" FOREIGN KEY ("routeId") REFERENCES "CognitiveRoute"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RouteWeek" ADD CONSTRAINT "RouteWeek_stageId_fkey" FOREIGN KEY ("stageId") REFERENCES "RouteStage"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FixedTimeSlotTemplate" ADD CONSTRAINT "FixedTimeSlotTemplate_userId_fkey" FOREIGN KEY ("userId") REFERENCES "UserProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CourseSlot" ADD CONSTRAINT "CourseSlot_userId_fkey" FOREIGN KEY ("userId") REFERENCES "UserProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OpenAgentSlot" ADD CONSTRAINT "OpenAgentSlot_userId_fkey" FOREIGN KEY ("userId") REFERENCES "UserProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RouteEvidenceNode" ADD CONSTRAINT "RouteEvidenceNode_userId_fkey" FOREIGN KEY ("userId") REFERENCES "UserProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RouteEvidenceNode" ADD CONSTRAINT "RouteEvidenceNode_skillNodeId_fkey" FOREIGN KEY ("skillNodeId") REFERENCES "SkillNode"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RouteEvidenceNode" ADD CONSTRAINT "RouteEvidenceNode_routeId_fkey" FOREIGN KEY ("routeId") REFERENCES "CognitiveRoute"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RouteEvidenceNode" ADD CONSTRAINT "RouteEvidenceNode_stageId_fkey" FOREIGN KEY ("stageId") REFERENCES "RouteStage"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RouteEvidenceNode" ADD CONSTRAINT "RouteEvidenceNode_routeWeekId_fkey" FOREIGN KEY ("routeWeekId") REFERENCES "RouteWeek"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CodexSidecarTask" ADD CONSTRAINT "CodexSidecarTask_userId_fkey" FOREIGN KEY ("userId") REFERENCES "UserProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CodexSidecarTask" ADD CONSTRAINT "CodexSidecarTask_planBlockId_fkey" FOREIGN KEY ("planBlockId") REFERENCES "PlanBlock"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CodexSidecarTask" ADD CONSTRAINT "CodexSidecarTask_routeWeekId_fkey" FOREIGN KEY ("routeWeekId") REFERENCES "RouteWeek"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BodyCheckin" ADD CONSTRAINT "BodyCheckin_executionLogId_fkey" FOREIGN KEY ("executionLogId") REFERENCES "ExecutionLog"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BodyCheckin" ADD CONSTRAINT "BodyCheckin_userId_fkey" FOREIGN KEY ("userId") REFERENCES "UserProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BodyCheckin" ADD CONSTRAINT "BodyCheckin_planBlockId_fkey" FOREIGN KEY ("planBlockId") REFERENCES "PlanBlock"("id") ON DELETE SET NULL ON UPDATE CASCADE;

