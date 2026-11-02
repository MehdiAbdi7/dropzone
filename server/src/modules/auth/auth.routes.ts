import { Router } from "express";
import { requireAuth } from "../../middlewares/auth.js";
import { loginLimiter, registerLimiter } from "../../middlewares/rateLimiters.js";
import { validate } from "../../middlewares/validate.js";
import { getMe, patchMe, postLogin, postLogout, postRegister } from "./auth.controller.js";
import { loginSchema, registerSchema, updateMeSchema } from "./auth.schema.js";

export const authRouter = Router();

authRouter.post("/register", registerLimiter, validate({ body: registerSchema }), postRegister);
authRouter.post("/login", loginLimiter, validate({ body: loginSchema }), postLogin);
authRouter.post("/logout", postLogout);
authRouter.get("/me", requireAuth, getMe);
authRouter.patch("/me", requireAuth, validate({ body: updateMeSchema }), patchMe);
