import { Router } from "express";

import * as OrganizationController from '../controllers/organization/organizations.js';
import { validateGetOrganization } from '../validators/organizations.js'

const router = new Router();

router.get('/',
  validateGetOrganization,
  OrganizationController.getOrganization)
router.post('/',
  //TODO: validate needs to be created
  // validateCreateOrganization,
  OrganizationController.createOrganization)
// router.post('/register',
//   validateRegister,
//   AuthController.register)
// router.post('/confirm-user',
//   validateConfirm,
//   AuthController.confirmUser)

export default router;
