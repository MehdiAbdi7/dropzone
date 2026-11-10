ALTER TABLE "product_variants" DROP CONSTRAINT "product_variants_refurbished_check";
ALTER TABLE "product_variants"
  ADD CONSTRAINT "product_variants_stock_max_check" CHECK ("stock" <= 10000);
