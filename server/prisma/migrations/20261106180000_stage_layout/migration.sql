-- La place de chaque photo du socle, réglée par le gérant (06/11). Null : la place de départ.
ALTER TABLE "stage_slots" ADD COLUMN "x" DOUBLE PRECISION,
ADD COLUMN "y" DOUBLE PRECISION,
ADD COLUMN "w" DOUBLE PRECISION,
ADD COLUMN "z" INTEGER;
