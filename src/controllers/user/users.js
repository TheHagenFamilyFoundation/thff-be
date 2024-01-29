import { validationResult } from "express-validator";
import Logger from '../../utils/logger.js';
import { User } from '../../models/index.js'

//TODO
export const getUsers = async (req, res) => {
  let message = { data: 'OK' };
  return res.status(200).send(message);
}

//mongo _id
export const getUser = async (req, res) => {
  Logger.info('Inside getUser');
  const errors = validationResult(req);

  if (!errors.isEmpty()) {
    Logger.error(`We have Errors: ${errors.array()}`)
    return res.status(422).json({ error: errors.array() });
  }

  const { id } = req.query;

  try {
    const user = await User.findOne({ _id: id }).populate('organizations');

    // let message = { data: 'OK' };
    Logger.debug(`sending back user ${user}`);
    return res.status(200).send(user);
  }
  catch (e) {
    Logger.error(`Error getting user ${id}`);
    return res.status(500).json(e.message);
  }
  // return res.status(200).send(message);
}
