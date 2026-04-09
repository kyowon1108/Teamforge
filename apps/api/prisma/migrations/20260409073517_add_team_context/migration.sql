-- CreateEnum
CREATE TYPE "TeamType" AS ENUM ('HACKATHON', 'CAPSTONE', 'BOOTCAMP', 'SIDE_PROJECT', 'STARTUP');

-- CreateEnum
CREATE TYPE "ProjectDuration" AS ENUM ('UNDER_1_DAY', 'ONE_TO_FOUR_WEEKS', 'ONE_TO_THREE_MONTHS', 'OVER_THREE_MONTHS');

-- CreateEnum
CREATE TYPE "CompletionTarget" AS ENUM ('DEMO', 'MVP', 'PRODUCTION');

-- AlterTable
ALTER TABLE "Team" ADD COLUMN     "completionTarget" "CompletionTarget",
ADD COLUMN     "domainHints" TEXT[] DEFAULT ARRAY[]::TEXT[],
ADD COLUMN     "hasNonDeveloper" BOOLEAN,
ADD COLUMN     "hasSkillGap" BOOLEAN,
ADD COLUMN     "projectDuration" "ProjectDuration",
ADD COLUMN     "teamType" "TeamType",
ADD COLUMN     "usesVibeCoding" BOOLEAN;
