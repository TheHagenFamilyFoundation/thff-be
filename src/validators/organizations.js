import { check } from 'express-validator'

export const validateGetOrganizations = [
]

export const validateGetOrganization = [
  // param('id').exists()
]

export const validateCreateOrganization = [
  check('orgInfo').notEmpty()
];

export const validateCountOrganizations = [
  check('name').optional()
]
