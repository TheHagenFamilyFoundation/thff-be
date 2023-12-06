import { validationResult } from 'express-validator';

import * as UserValidators from './users';

const validationErrors = (req, res, next) => {
  const validationErrors = validationResult(req);

  if (!validationErrors.isEmpty()) {
    return res.status(422).json(validationErrors);
  }

  next();
};

export {
  UserValidators,
  validationErrors
};
