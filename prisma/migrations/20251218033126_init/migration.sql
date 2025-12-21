-- CreateTable
CREATE TABLE "Incident" (
    "id" TEXT NOT NULL,
    "emergencyType" TEXT NOT NULL,
    "location" TEXT NOT NULL,
    "urgency" TEXT NOT NULL,
    "dispatchDrone" BOOLEAN NOT NULL,
    "estimatedMinutesSaved" INTEGER NOT NULL,
    "bystanderInstructions" JSONB NOT NULL,
    "responsePlan" JSONB NOT NULL,
    "jobId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Incident_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ExecutionEvent" (
    "id" TEXT NOT NULL,
    "incidentId" TEXT NOT NULL,
    "actionType" TEXT NOT NULL,
    "success" BOOLEAN NOT NULL,
    "message" TEXT NOT NULL,
    "executedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ExecutionEvent_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ExecutionEvent_incidentId_idx" ON "ExecutionEvent"("incidentId");

-- AddForeignKey
ALTER TABLE "ExecutionEvent" ADD CONSTRAINT "ExecutionEvent_incidentId_fkey" FOREIGN KEY ("incidentId") REFERENCES "Incident"("id") ON DELETE CASCADE ON UPDATE CASCADE;
