-- AlterTable
ALTER TABLE "TeamMembership" ADD COLUMN     "confirmedAt" TIMESTAMP(3),
ADD COLUMN     "confirmedBy" TEXT,
ADD COLUMN     "confirmedRole" TEXT;
