-- AlterTable
ALTER TABLE "device_models" ADD COLUMN     "poster_color" TEXT,
ADD COLUMN     "series_id" INTEGER,
ADD COLUMN     "series_position" INTEGER NOT NULL DEFAULT 0;

-- CreateTable
CREATE TABLE "series" (
    "id" SERIAL NOT NULL,
    "brand_id" INTEGER NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "cover_url" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "series_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "series_brand_id_slug_key" ON "series"("brand_id", "slug");

-- CreateIndex
CREATE INDEX "device_models_series_id_idx" ON "device_models"("series_id");

-- AddForeignKey
ALTER TABLE "series" ADD CONSTRAINT "series_brand_id_fkey" FOREIGN KEY ("brand_id") REFERENCES "brands"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "device_models" ADD CONSTRAINT "device_models_series_id_fkey" FOREIGN KEY ("series_id") REFERENCES "series"("id") ON DELETE SET NULL ON UPDATE CASCADE;
