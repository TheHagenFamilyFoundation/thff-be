import { Router } from "express";

import * as UserController from '../../controllers/user/users.js';
import { validateGetUser } from '../../validators/users.js'

const router = new Router();

router.get('/',
  validateGetUser,
  UserController.getUser)
// router.post('/register',
//   validateRegister,
//   AuthController.register)
// router.post('/confirm-user',
//   validateConfirm,
//   AuthController.confirmUser)

export default router;
