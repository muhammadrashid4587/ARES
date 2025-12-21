-- AlterTable
ALTER TABLE "ExecutionEvent" ADD COLUMN     "operatorId" TEXT,
ADD COLUMN     "operatorRole" TEXT;

-- AlterTable
ALTER TABLE "Incident" ADD COLUMN     "abortRequestedAt" TIMESTAMP(3),
ADD COLUMN     "abortRequestedBy" TEXT,
ADD COLUMN     "createdByOperatorId" TEXT,
ADD COLUMN     "createdByRole" TEXT;

-- AlterTable
ALTER TABLE "IncidentEvent" ADD COLUMN     "operatorId" TEXT,
ADD COLUMN     "operatorRole" TEXT;

-- CreateTable
CREATE TABLE "AuditLogEntry" (
    "id" TEXT NOT NULL,
    "incidentId" TEXT NOT NULL,
    "timestamp" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "operatorId" TEXT NOT NULL,
    "operatorRole" TEXT NOT NULL,
    "actionType" TEXT NOT NULL,
    "payloadSummary" JSONB NOT NULL,
    "success" BOOLEAN NOT NULL,

    CONSTRAINT "AuditLogEntry_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "AuditLogEntry_incidentId_idx" ON "AuditLogEntry"("incidentId");

-- CreateIndex
CREATE INDEX "AuditLogEntry_incidentId_timestamp_idx" ON "AuditLogEntry"("incidentId", "timestamp");

-- AddForeignKey
ALTER TABLE "AuditLogEntry" ADD CONSTRAINT "AuditLogEntry_incidentId_fkey" FOREIGN KEY ("incidentId") REFERENCES "Incident"("id") ON DELETE CASCADE ON UPDATE CASCADE;
