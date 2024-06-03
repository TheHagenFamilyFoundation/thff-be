import { Router } from "express";

import * as AuthController from '../../controllers/user/auth.js';
import { validateAuth, validateRegister, validateConfirm, validateNewPassword } from "../../validators/users.js";

const router = new Router();

router.post('/login',
  validateAuth,
  AuthController.login)
router.post('/register',
  validateRegister,
  AuthController.register)
router.post('/confirm-user',
  validateConfirm,
  AuthController.confirmUser)
router.post('/refresh-access-token',
  //TODO: missing validate
  AuthController.refreshAccessToken)
router.post('/forgot-password',
  //TODO: missing validate
  AuthController.forgotPassword)
router.put('/reset-password',
  validateNewPassword,
  AuthController.setNewPassword)

export default router;
