import bcrypt from 'bcrypt';
import { validationResult } from "express-validator";
import Logger from '../../utils/logger.js';
import { User } from '../../models/index.js'
import { saltRounds } from "../../utils/util.js"

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

    Logger.debug(`sending back user ${user}`);
    return res.status(200).send(user);
  }
  catch (e) {
    Logger.error(`Error getting user ${id}`);
    return res.status(500).json(e.message);
  }
}

// Update user profile (firstName, lastName)
export const updateProfile = async (req, res) => {
  Logger.info('Inside updateProfile');

  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    Logger.error(`Validation errors: ${JSON.stringify(errors.array())}`);
    return res.status(422).json({ error: errors.array() });
  }

  // userID comes from the decoded JWT token (set by auth middleware)
  const { userID } = req.decoded;
  const { firstName, lastName } = req.body;

  try {
    const updateFields = {};
    if (firstName !== undefined) updateFields.firstName = firstName;
    if (lastName !== undefined) updateFields.lastName = lastName;

    const user = await User.findOneAndUpdate(
      { _id: userID },
      updateFields,
      { new: true }
    ).populate('organizations');

    if (!user) {
      Logger.error(`User not found: ${userID}`);
      return res.status(404).json({ message: 'User not found' });
    }

    Logger.info(`Profile updated for user ${userID}`);
    return res.status(200).json({ message: 'Profile updated', user });
  } catch (e) {
    Logger.error(`Error updating profile for user ${userID}: ${e.message}`);
    return res.status(500).json({ message: 'Error updating profile' });
  }
}

// Change password (requires current password)
export const changePassword = async (req, res) => {
  Logger.info('Inside changePassword');

  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    Logger.error(`Validation errors: ${JSON.stringify(errors.array())}`);
    return res.status(422).json({ error: errors.array() });
  }

  const { userID } = req.decoded;
  const { currentPassword, newPassword } = req.body;

  try {
    const user = await User.findOne({ _id: userID });

    if (!user) {
      Logger.error(`User not found: ${userID}`);
      return res.status(404).json({ message: 'User not found' });
    }

    // Verify current password
    const isValid = await bcrypt.compare(currentPassword, user.encryptedPassword);
    if (!isValid) {
      Logger.error(`Invalid current password for user ${userID}`);
      return res.status(400).json({ message: 'Current password is incorrect' });
    }

    // Hash new password
    const passwordSalt = await bcrypt.genSalt(saltRounds);
    const encryptedPassword = await bcrypt.hash(newPassword, passwordSalt);

    await User.updateOne({ _id: userID }, { encryptedPassword });

    Logger.info(`Password changed for user ${userID}`);
    return res.status(200).json({ message: 'Password changed successfully' });
  } catch (e) {
    Logger.error(`Error changing password for user ${userID}: ${e.message}`);
    return res.status(500).json({ message: 'Error changing password' });
  }
}
