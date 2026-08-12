/*
  Warnings:

  - You are about to drop the column `attemptHistory` on the `jobs` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "jobs" DROP COLUMN "attemptHistory",
ADD COLUMN     "bullmqJobId" TEXT;
