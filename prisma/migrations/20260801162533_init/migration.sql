-- CreateTable
CREATE TABLE "ComparisonRun" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "workloadSeed" TEXT NOT NULL,
    "patientCount" INTEGER NOT NULL,
    "notes" TEXT
);

-- CreateTable
CREATE TABLE "AlgorithmResult" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "runId" TEXT NOT NULL,
    "algorithm" TEXT NOT NULL,
    "avgWaitMs" INTEGER NOT NULL,
    "maxWaitMs" INTEGER NOT NULL,
    "avgTurnaroundMs" INTEGER NOT NULL,
    "maxTurnaroundMs" INTEGER NOT NULL,
    "highPriorityAvgWaitMs" INTEGER NOT NULL,
    "highPriorityAvgResponseMs" INTEGER NOT NULL,
    "utilizationPercent" REAL NOT NULL,
    "patientsServed" INTEGER NOT NULL,
    CONSTRAINT "AlgorithmResult_runId_fkey" FOREIGN KEY ("runId") REFERENCES "ComparisonRun" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
