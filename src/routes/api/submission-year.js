import { Router } from "express";

import * as SubmissionYearController from '../../controllers/admin/submission-years.js';
import {
  validateGetSubmissionYears,
  validateGetSubmissionYear,
  validateGetCurrentSubmissionYear,
  validateCreateSubmissionYear,
  validateToggleSubmissionYear,
  validateCountSubmissionYears
} from '../../validators/submission-years.js';

const router = new Router();

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
router.post('/',
  validateCreateSubmissionYear,
  SubmissionYearController.createSubmissionYear)
router.put('/toggle',
  validateToggleSubmissionYear,
  SubmissionYearController.toggleSubmissionYear)

export default router;
