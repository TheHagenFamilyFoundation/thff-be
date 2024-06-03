import { Router } from "express";

import * as OrganizationInfosController from '../../controllers/organization/organization-infos.js';
import { validateGetOrganizationInfos } from '../../validators/organization-infos.js'

const router = new Router();

router.get('/',
  validateGetOrganizationInfos,
  OrganizationInfosController.getOrganizationInfo)
router.patch('/',
  //TODO: validate the patch
  // validateGetOrganizationInfos,
  OrganizationInfosController.updateOrganizationInfo)

export default router;
