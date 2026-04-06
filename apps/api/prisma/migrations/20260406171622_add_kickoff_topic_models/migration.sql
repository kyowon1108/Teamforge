-- CreateEnum
CREATE TYPE "TopicJobStatus" AS ENUM ('pending', 'processing', 'completed', 'failed');

-- CreateTable
CREATE TABLE "KickoffTopicJob" (
    "id" TEXT NOT NULL,
    "teamId" TEXT NOT NULL,
    "status" "TopicJobStatus" NOT NULL DEFAULT 'pending',
    "errorMsg" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "KickoffTopicJob_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "KickoffTopic" (
    "id" TEXT NOT NULL,
    "teamId" TEXT NOT NULL,
    "jobId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "rationale" TEXT NOT NULL,
    "tags" TEXT[],
    "aiGenerated" BOOLEAN NOT NULL DEFAULT true,
    "confirmedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "KickoffTopic_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "KickoffReaction" (
    "id" TEXT NOT NULL,
    "topicId" TEXT NOT NULL,
    "teamId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "reaction" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "KickoffReaction_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "KickoffTopicJob_teamId_key" ON "KickoffTopicJob"("teamId");

-- CreateIndex
CREATE UNIQUE INDEX "KickoffReaction_topicId_userId_key" ON "KickoffReaction"("topicId", "userId");

-- AddForeignKey
ALTER TABLE "KickoffTopicJob" ADD CONSTRAINT "KickoffTopicJob_teamId_fkey" FOREIGN KEY ("teamId") REFERENCES "Team"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "KickoffTopic" ADD CONSTRAINT "KickoffTopic_teamId_fkey" FOREIGN KEY ("teamId") REFERENCES "Team"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "KickoffTopic" ADD CONSTRAINT "KickoffTopic_jobId_fkey" FOREIGN KEY ("jobId") REFERENCES "KickoffTopicJob"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "KickoffReaction" ADD CONSTRAINT "KickoffReaction_topicId_fkey" FOREIGN KEY ("topicId") REFERENCES "KickoffTopic"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "KickoffReaction" ADD CONSTRAINT "KickoffReaction_teamId_fkey" FOREIGN KEY ("teamId") REFERENCES "Team"("id") ON DELETE CASCADE ON UPDATE CASCADE;
