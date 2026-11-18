-- L'atelier, étape 1 (18/11) : les pièces et le journal de leur stock. Migration additive : rien d'existant
-- n'est touché.

CREATE TYPE "PartMovementKind" AS ENUM ('arrival', 'correction');

CREATE TABLE "parts" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "purchase_price" INTEGER NOT NULL,
    "sale_price" INTEGER NOT NULL,
    "stock" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "parts_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "part_movements" (
    "id" SERIAL NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "part_id" INTEGER NOT NULL,
    "kind" "PartMovementKind" NOT NULL,
    "delta" INTEGER NOT NULL,
    "unit_cost" INTEGER,
    "stock_after" INTEGER NOT NULL,
    "user_id" INTEGER,
    "note" TEXT,

    CONSTRAINT "part_movements_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "part_movements_part_id_idx" ON "part_movements"("part_id");

-- Le nom est unique sans tenir compte de la casse ni des espaces autour : « Batterie iPhone 13 » et
-- « batterie iphone 13 » sont la même pièce. Prisma ne décrit pas cet index.
CREATE UNIQUE INDEX "parts_name_key" ON "parts" (lower(btrim("name")));

-- La clé étrangère refuse de supprimer une pièce qui a un journal.
ALTER TABLE "part_movements" ADD CONSTRAINT "part_movements_part_id_fkey" FOREIGN KEY ("part_id") REFERENCES "parts"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- Les garde-fous : même si le code se trompe, la base refuse.
ALTER TABLE "parts" ADD CONSTRAINT "parts_stock_check" CHECK ("stock" >= 0);
ALTER TABLE "parts" ADD CONSTRAINT "parts_purchase_price_check" CHECK ("purchase_price" >= 0);
ALTER TABLE "parts" ADD CONSTRAINT "parts_sale_price_check" CHECK ("sale_price" >= 0);
ALTER TABLE "part_movements" ADD CONSTRAINT "part_movements_delta_check" CHECK ("delta" <> 0);
ALTER TABLE "part_movements" ADD CONSTRAINT "part_movements_stock_after_check" CHECK ("stock_after" >= 0);
