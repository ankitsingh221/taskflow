-- CreateTable
CREATE TABLE "JobDependency" (
    "id" SERIAL NOT NULL,
    "jobId" INTEGER NOT NULL,
    "dependsOnJobId" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "JobDependency_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "JobDependency_jobId_dependsOnJobId_key" ON "JobDependency"("jobId", "dependsOnJobId");

-- AddForeignKey
ALTER TABLE "JobDependency" ADD CONSTRAINT "JobDependency_jobId_fkey" FOREIGN KEY ("jobId") REFERENCES "jobs"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "JobDependency" ADD CONSTRAINT "JobDependency_dependsOnJobId_fkey" FOREIGN KEY ("dependsOnJobId") REFERENCES "jobs"("id") ON DELETE CASCADE ON UPDATE CASCADE;
