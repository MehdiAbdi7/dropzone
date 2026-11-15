import { Router } from "express";
import { requireAuth } from "../../middlewares/auth.js";
import { accountLimiter, loginLimiter, registerLimiter } from "../../middlewares/rateLimiters.js";
import { validate } from "../../middlewares/validate.js";
import { getMe, patchEmail, patchMe, patchPassword, postLogin, postLogout, postRegister } from "./auth.controller.js";
import { changeEmailSchema, changePasswordSchema, loginSchema, registerSchema, updateMeSchema } from "./auth.schema.js";

export const authRouter = Router();

authRouter.post("/register", registerLimiter, validate({ body: registerSchema }), postRegister);
authRouter.post("/login", loginLimiter, validate({ body: loginSchema }), postLogin);
authRouter.post("/logout", postLogout);
authRouter.get("/me", requireAuth, getMe);
authRouter.patch("/me", requireAuth, validate({ body: updateMeSchema }), patchMe);
// Mon compte (15/11) : changer son mot de passe ou son email exige le mot de passe actuel.
authRouter.patch("/password", requireAuth, accountLimiter, validate({ body: changePasswordSchema }), patchPassword);
authRouter.patch("/email", requireAuth, accountLimiter, validate({ body: changeEmailSchema }), patchEmail);
