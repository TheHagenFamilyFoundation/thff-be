import { Router } from "express";
import rateLimit from "express-rate-limit";

import * as AuthController from '../../controllers/user/auth.js';
import { validateAuth, validateRegister, validateConfirm, validateNewPassword } from "../../validators/users.js";

const router = new Router();

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 30,
  standardHeaders: true,
  legacyHeaders: false,
  message: { code: "RATE001", message: "Too many auth attempts. Try again later." },
});

const passwordLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: { code: "RATE001", message: "Too many password requests. Try again later." },
});

router.post('/login',
  authLimiter,
  validateAuth,
  AuthController.login)
router.post('/register',
  authLimiter,
  validateRegister,
  AuthController.register)
router.post('/confirm-user',
  authLimiter,
  validateConfirm,
  AuthController.confirmUser)
router.post('/refresh-access-token',
  authLimiter,
  AuthController.refreshAccessToken)
router.post('/forgot-password',
  passwordLimiter,
  AuthController.forgotPassword)
router.put('/reset-password',
  passwordLimiter,
  validateNewPassword,
  AuthController.setNewPassword)

export default router;
