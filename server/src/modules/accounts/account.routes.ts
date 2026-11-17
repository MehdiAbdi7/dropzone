import { Router } from "express";
import { validate } from "../../middlewares/validate.js";
import { idParamsSchema } from "../../utils/idParams.js";
import { getAccounts, patchAccount, postAccount, postAccountPassword } from "./account.controller.js";
import { accountPasswordSchema, createAccountSchema, updateAccountSchema } from "./account.schema.js";

// Monté sous /admin. Aucune règle dans la table de middlewares/access.ts : ces routes sont pour l'admin seul.
export const accountAdminRouter = Router();
accountAdminRouter.get("/accounts", getAccounts);
accountAdminRouter.post("/accounts", validate({ body: createAccountSchema }), postAccount);
accountAdminRouter.patch("/accounts/:id", validate({ params: idParamsSchema, body: updateAccountSchema }), patchAccount);
accountAdminRouter.post(
  "/accounts/:id/password",
  validate({ params: idParamsSchema, body: accountPasswordSchema }),
  postAccountPassword,
);
