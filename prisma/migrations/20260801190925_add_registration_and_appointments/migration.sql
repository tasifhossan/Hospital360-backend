-- CreateTable
CREATE TABLE "ComparisonRun" (
    "id" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "workloadSeed" TEXT NOT NULL,
    "patientCount" INTEGER NOT NULL,
    "notes" TEXT,

    CONSTRAINT "ComparisonRun_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AlgorithmResult" (
    "id" TEXT NOT NULL,
    "runId" TEXT NOT NULL,
    "algorithm" TEXT NOT NULL,
    "avgWaitMs" INTEGER NOT NULL,
    "maxWaitMs" INTEGER NOT NULL,
    "avgTurnaroundMs" INTEGER NOT NULL,
    "maxTurnaroundMs" INTEGER NOT NULL,
    "highPriorityAvgWaitMs" INTEGER NOT NULL,
    "highPriorityAvgResponseMs" INTEGER NOT NULL,
    "utilizationPercent" DOUBLE PRECISION NOT NULL,
    "patientsServed" INTEGER NOT NULL,

    CONSTRAINT "AlgorithmResult_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RegisteredPatient" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "condition" TEXT NOT NULL,
    "priority" TEXT NOT NULL,
    "requiredResources" TEXT[],
    "status" TEXT NOT NULL DEFAULT 'REGISTERED',
    "registeredAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "registeredBy" TEXT NOT NULL,
    "simulationPatientId" TEXT,

    CONSTRAINT "RegisteredPatient_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "StaffMember" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "role" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "StaffMember_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Appointment" (
    "id" TEXT NOT NULL,
    "patientName" TEXT NOT NULL,
    "staffId" TEXT NOT NULL,
    "scheduledAt" TIMESTAMP(3) NOT NULL,
    "reason" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'SCHEDULED',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Appointment_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "AlgorithmResult" ADD CONSTRAINT "AlgorithmResult_runId_fkey" FOREIGN KEY ("runId") REFERENCES "ComparisonRun"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Appointment" ADD CONSTRAINT "Appointment_staffId_fkey" FOREIGN KEY ("staffId") REFERENCES "StaffMember"("id") ON DELETE CASCADE ON UPDATE CASCADE;
