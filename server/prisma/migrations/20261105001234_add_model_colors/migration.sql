-- AlterTable
ALTER TABLE "device_models" ADD COLUMN     "colors" TEXT[] DEFAULT ARRAY[]::TEXT[];
