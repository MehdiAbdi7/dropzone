CREATE TABLE IF NOT EXISTS "choice_lists" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "group" "ChoiceGroup",
    "kinds" "ProductKind"[] NOT NULL DEFAULT ARRAY[]::"ProductKind"[],
    "multiple" BOOLEAN NOT NULL DEFAULT false,
    CONSTRAINT "choice_lists_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "choice_lists_group_key" ON "choice_lists"("group");
CREATE UNIQUE INDEX IF NOT EXISTS "choice_lists_name_key" ON "choice_lists"("name");

INSERT INTO "choice_lists" ("name", "group", "kinds", "multiple") VALUES
    ('Stockage', 'storage', ARRAY['phone', 'tablet', 'laptop']::"ProductKind"[], false),
    ('Couleurs', 'color', ARRAY['phone', 'tablet', 'laptop', 'watch', 'accessory', 'audiovisual']::"ProductKind"[], false),
    ('RAM', 'ram', ARRAY['phone', 'laptop']::"ProductKind"[], false),
    ('Processeurs', 'processor', ARRAY['laptop']::"ProductKind"[], false),
    ('Claviers', 'keyboard', ARRAY['laptop']::"ProductKind"[], false),
    ('Tailles de boîtier', 'size', ARRAY['watch']::"ProductKind"[], false),
    ('Connectivité', 'connectivity', ARRAY['tablet', 'watch']::"ProductKind"[], false),
    ('Pièces remplacées', 'replaced_part', ARRAY['phone', 'tablet', 'laptop', 'watch']::"ProductKind"[], false),
    ('Défauts visibles', 'defect', ARRAY['phone', 'tablet', 'laptop', 'watch']::"ProductKind"[], false),
    ('Limitations', 'limitation', ARRAY['phone', 'tablet', 'laptop', 'watch']::"ProductKind"[], false),
    ('SIM', 'sim', ARRAY['phone', 'tablet']::"ProductKind"[], false),
    ('Cartes graphiques', 'gpu', ARRAY['laptop']::"ProductKind"[], true),
    ('Pays d''origine', 'origin', ARRAY['phone', 'tablet', 'laptop', 'watch', 'accessory', 'audiovisual']::"ProductKind"[], false)
ON CONFLICT DO NOTHING;

ALTER TABLE "choices" ALTER COLUMN "group" DROP NOT NULL;
ALTER TABLE "choices" ADD COLUMN IF NOT EXISTS "list_id" INTEGER;

UPDATE "choices" AS choice
SET "list_id" = list.id
FROM "choice_lists" AS list
WHERE choice."list_id" IS NULL
  AND choice."group" IS NOT DISTINCT FROM list."group";

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'choices_list_id_fkey') THEN
        ALTER TABLE "choices"
            ADD CONSTRAINT "choices_list_id_fkey"
            FOREIGN KEY ("list_id") REFERENCES "choice_lists"("id")
            ON DELETE CASCADE ON UPDATE CASCADE;
    END IF;
END $$;

CREATE UNIQUE INDEX IF NOT EXISTS "choices_list_id_label_key" ON "choices"("list_id", "label");
