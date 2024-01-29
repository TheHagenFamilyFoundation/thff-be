import { check } from 'express-validator'

export const validateGetOrganization = [
  check('organizationID').notEmpty()
]

export const validateCreateOrganization = [
  check('orgInfo').notEmpty()
];
