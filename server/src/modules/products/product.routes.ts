import { Router } from "express";
import { validate } from "../../middlewares/validate.js";
import { getProduct, getProducts } from "./product.controller.js";
import { productListQuerySchema, slugParamsSchema } from "./product.schema.js";

export const productRouter = Router();

productRouter.get("/", validate({ query: productListQuerySchema }), getProducts);
productRouter.get("/:slug", validate({ params: slugParamsSchema }), getProduct);
