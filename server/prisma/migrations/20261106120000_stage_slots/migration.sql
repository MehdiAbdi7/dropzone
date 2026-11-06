-- CreateTable
CREATE TABLE "stage_slots" (
    "id" SERIAL NOT NULL,
    "stage" TEXT NOT NULL,
    "slot" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "public_id" TEXT,

    CONSTRAINT "stage_slots_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "stage_slots_stage_slot_key" ON "stage_slots"("stage", "slot");
