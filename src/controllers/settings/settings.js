import { validationResult } from "express-validator";
import Logger from '../../utils/logger.js';
import { UserSetting } from '../../models/index.js';

// GET /settings?userID=...
export const getSettings = async (req, res) => {
  Logger.info('Inside getSettings');

  const { userID } = req.query;

  if (!userID) {
    return res.status(400).json({ message: 'userID is required' });
  }

  try {
    let settings = await UserSetting.findOne({ userID });

    if (!settings) {
      // Create default settings if none exist
      settings = await UserSetting.create({
        scheme: 'light',
        userID,
      });
    }

    return res.status(200).json(settings);
  } catch (e) {
    Logger.error(`Error getting settings for user ${userID}: ${e.message}`);
    return res.status(500).json({ message: 'Error getting settings' });
  }
};

// PUT /settings
export const saveSettings = async (req, res) => {
  Logger.info('Inside saveSettings');

  const { userID, scheme } = req.body;

  if (!userID || !scheme) {
    return res.status(400).json({ message: 'userID and scheme are required' });
  }

  if (!['light', 'dark'].includes(scheme)) {
    return res.status(400).json({ message: 'scheme must be "light" or "dark"' });
  }

  try {
    let settings = await UserSetting.findOneAndUpdate(
      { userID },
      { scheme },
      { new: true, upsert: true }
    );

    Logger.info(`Settings saved for user ${userID}: scheme=${scheme}`);
    return res.status(200).json({ message: 'Settings saved', settings });
  } catch (e) {
    Logger.error(`Error saving settings for user ${userID}: ${e.message}`);
    return res.status(500).json({ message: 'Error saving settings' });
  }
};
