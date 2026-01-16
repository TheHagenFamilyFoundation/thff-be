import { Router } from "express";

import * as SubmissionYearController from '../../controllers/admin/submission-years.js';
import {
  validateGetSubmissionYears,
  validateGetSubmissionYear,
  validateGetCurrentSubmissionYear,
  validateCountSubmissionYears
} from '../../validators/submission-years.js';

const router = new Router();

// Public GET endpoints (no authentication required)
router.get('/',
  validateGetSubmissionYears,
  SubmissionYearController.getSubmissionYears)
router.get('/current',
  validateGetCurrentSubmissionYear,
  SubmissionYearController.getCurrentSubmissionYear)
router.get('/count',
  validateCountSubmissionYears,
  SubmissionYearController.countSubmissionYears)
router.get('/:id',
  validateGetSubmissionYear,
  SubmissionYearController.getSubmissionYear)

export default router;
