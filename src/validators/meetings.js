import { body } from 'express-validator';

export const validateCreateMeeting = [
  body('submissionYear').notEmpty().withMessage('submissionYear is required'),
  body('year').isNumeric().withMessage('year must be a number'),
];

export const validateUpdateMeeting = [];

export const validateUpdateAllocations = [
  body('allocations').isArray({ min: 1 }).withMessage('allocations array is required'),
];
