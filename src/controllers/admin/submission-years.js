import { validationResult } from "express-validator";

import Logger from "../../utils/logger.js";

export const getSubmissionYears = async (req, res) => {
  Logger.verbose('Inside getSubmissionYear');

  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    Logger.error(`We have Errors: ${errors.array()}`)
    return res.status(422).json({ error: errors.array() });
  }
  //return all submission years


  return res.status(200).json({ message: 'OK' });
}

export const getSubmissionYear = async (req, res) => {
  Logger.verbose('Inside getSubmissionYear');

  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    Logger.error(`We have Errors: ${errors.array()}`)
    return res.status(422).json({ error: errors.array() });
  }
  //get specific submission year


  return res.status(200).json({ message: 'OK' });
}

export const createSubmissionYear = async (req, res) => {
  Logger.verbose('Inside createSubmissionYear');

  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    Logger.error(`We have Errors: ${errors.array()}`)
    return res.status(422).json({ error: errors.array() });
  }

  //check todays date. if current date is not made yet, make it else return 400 cannot create

  return res.status(200).json({ message: 'OK' });
}

export const toggleSubmissionYear = async (req, res) => {
  Logger.verbose('Inside toggleSubmissionYear');

  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    Logger.error(`We have Errors: ${errors.array()}`)
    return res.status(422).json({ error: errors.array() });
  }

  //toggle portal is open for given year or close

  return res.status(200).json({ message: 'OK' });
}
