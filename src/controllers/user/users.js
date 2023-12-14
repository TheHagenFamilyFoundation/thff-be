import Logger from '../../utils/logger.js';

import { User } from '../../models/index.js'

export const getUsers = async (req, res) => {
  let message = { data: 'OK' };
  return res.status(200).send(message);
}

//mongo _id
export const getUser = async (req, res) => {
  Logger.info('Inside getUser');

  const { id } = req.query;

  const user = await User.findOne({ _id: id });

  return res.status(200).send(user);
}
