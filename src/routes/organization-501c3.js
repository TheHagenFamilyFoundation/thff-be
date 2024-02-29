import { Router } from "express";
import * as Organization501c3Controller from '../controllers/organization/organizations-501c3.js';
import { validateGet501c3, validateUpload501c3, validateDelete501c3 } from '../validators/organizations501c3.js'

const router = new Router();
router.get('/:id',
  validateGet501c3,
  Organization501c3Controller.get501c3Doc)
router.post('/:orgId',
  validateUpload501c3,
  Organization501c3Controller.upload501c3Doc)
router.delete('/:id',
  validateDelete501c3,
  Organization501c3Controller.delete501c3Doc)

export default router;
