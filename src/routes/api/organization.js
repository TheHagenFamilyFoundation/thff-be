import { Router } from "express";

import * as OrganizationController from '../../controllers/organization/organizations.js';
import { injectOrganization } from "../../middlewares/model-injections.js";
import { validateGetOrganizations, validateGetOrganization, validateCountOrganizations } from '../../validators/organizations.js'

const router = new Router();

router.get('/',
  validateGetOrganizations,
  OrganizationController.getOrganizations)
router.get('/count',
  validateCountOrganizations,
  OrganizationController.countOrganizations)
router.get('/orgID/:orgID',
  validateGetOrganization,
  injectOrganization,
  OrganizationController.getOrganization)
router.get('/:id',
  validateGetOrganization,
  OrganizationController.getOrganization)
router.post('/',
  //TODO: validate needs to be created
  // validateCreateOrganization,
  OrganizationController.createOrganization)


export default router;
