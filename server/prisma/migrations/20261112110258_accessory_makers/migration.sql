-- AlterTable
ALTER TABLE "products" ADD COLUMN     "maker_id" INTEGER;

-- CreateTable
CREATE TABLE "accessory_makers" (
    "id" SERIAL NOT NULL,
    "type_id" INTEGER NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "logo_url" TEXT,
    "position" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "accessory_makers_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "accessory_makers_type_id_slug_key" ON "accessory_makers"("type_id", "slug");

-- CreateIndex
CREATE INDEX "products_maker_id_idx" ON "products"("maker_id");

-- AddForeignKey
ALTER TABLE "accessory_makers" ADD CONSTRAINT "accessory_makers_type_id_fkey" FOREIGN KEY ("type_id") REFERENCES "brands"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "products" ADD CONSTRAINT "products_maker_id_fkey" FOREIGN KEY ("maker_id") REFERENCES "accessory_makers"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
