import { check } from 'express-validator'

export const validateGetOrganizationInfos = [
  check('organization').notEmpty()
]
