import { check } from 'express-validator'

export const validateUpload501c3 = [
  // check('orgId').notEmpty()
]

export const validateGet501c3 = [
  check('id').notEmpty()
];

export const validateDelete501c3 = [
  check('id').notEmpty()
];
