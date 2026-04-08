-- CreateEnum
CREATE TYPE "BrainstormPhase" AS ENUM ('ideation', 'sharing', 'clustering', 'voting', 'confirmed');

-- AlterTable
ALTER TABLE "KickoffTopic" ADD COLUMN     "sourceIdeaIds" TEXT[];

-- CreateTable
CREATE TABLE "BrainstormSession" (
    "id" TEXT NOT NULL,
    "teamId" TEXT NOT NULL,
    "phase" "BrainstormPhase" NOT NULL DEFAULT 'ideation',
    "facilitationMode" TEXT NOT NULL DEFAULT 'async',
    "startedAt" TIMESTAMP(3),
    "endAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "BrainstormSession_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BrainstormIdea" (
    "id" TEXT NOT NULL,
    "sessionId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "type" TEXT NOT NULL DEFAULT 'original',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "BrainstormIdea_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "IdeaBuildOnEdge" (
    "id" TEXT NOT NULL,
    "parentIdeaId" TEXT NOT NULL,
    "childIdeaId" TEXT NOT NULL,
    "createdBy" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "IdeaBuildOnEdge_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "IdeaReaction" (
    "id" TEXT NOT NULL,
    "ideaId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "content" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "IdeaReaction_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "BrainstormSession_teamId_key" ON "BrainstormSession"("teamId");

-- CreateIndex
CREATE INDEX "BrainstormIdea_sessionId_userId_idx" ON "BrainstormIdea"("sessionId", "userId");

-- CreateIndex
CREATE UNIQUE INDEX "IdeaBuildOnEdge_parentIdeaId_childIdeaId_key" ON "IdeaBuildOnEdge"("parentIdeaId", "childIdeaId");

-- CreateIndex
CREATE UNIQUE INDEX "IdeaReaction_ideaId_userId_type_key" ON "IdeaReaction"("ideaId", "userId", "type");

-- AddForeignKey
ALTER TABLE "BrainstormSession" ADD CONSTRAINT "BrainstormSession_teamId_fkey" FOREIGN KEY ("teamId") REFERENCES "Team"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BrainstormIdea" ADD CONSTRAINT "BrainstormIdea_sessionId_fkey" FOREIGN KEY ("sessionId") REFERENCES "BrainstormSession"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BrainstormIdea" ADD CONSTRAINT "BrainstormIdea_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "IdeaBuildOnEdge" ADD CONSTRAINT "IdeaBuildOnEdge_parentIdeaId_fkey" FOREIGN KEY ("parentIdeaId") REFERENCES "BrainstormIdea"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "IdeaBuildOnEdge" ADD CONSTRAINT "IdeaBuildOnEdge_childIdeaId_fkey" FOREIGN KEY ("childIdeaId") REFERENCES "BrainstormIdea"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "IdeaReaction" ADD CONSTRAINT "IdeaReaction_ideaId_fkey" FOREIGN KEY ("ideaId") REFERENCES "BrainstormIdea"("id") ON DELETE CASCADE ON UPDATE CASCADE;
