import { Router } from "express";

import * as UserController from '../../controllers/user/users.js';
import { validateGetUser, validateUpdateProfile, validateChangePassword } from '../../validators/users.js'

const router = new Router();

router.get('/',
  validateGetUser,
  UserController.getUser)

router.put('/update-profile',
  validateUpdateProfile,
  UserController.updateProfile)

router.put('/change-password',
  validateChangePassword,
  UserController.changePassword)

export default router;
