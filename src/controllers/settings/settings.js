import { validationResult } from "express-validator";
import Logger from '../../utils/logger.js';
import { UserSetting } from '../../models/index.js';
import {
  DEFAULT_TABLE_PAGE_SIZE,
  isValidTablePageSize,
} from '../../utils/table-page-size.js';

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
        tablePageSize: DEFAULT_TABLE_PAGE_SIZE,
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

  const { userID, scheme, tablePageSize } = req.body;

  if (!userID) {
    return res.status(400).json({ message: 'userID is required' });
  }

  const update = {};

  if (scheme !== undefined) {
    if (!['light', 'dark'].includes(scheme)) {
      return res.status(400).json({ message: 'scheme must be "light" or "dark"' });
    }
    update.scheme = scheme;
  }

  if (tablePageSize !== undefined) {
    if (!isValidTablePageSize(tablePageSize)) {
      return res.status(400).json({ message: 'tablePageSize must be one of 5, 10, 25, 50, or 100' });
    }
    update.tablePageSize = Number(tablePageSize);
  }

  if (Object.keys(update).length === 0) {
    return res.status(400).json({ message: 'At least one setting field is required' });
  }

  try {
    let settings = await UserSetting.findOneAndUpdate(
      { userID },
      update,
      { new: true, upsert: true }
    );

    Logger.info(`Settings saved for user ${userID}: ${JSON.stringify(update)}`);
    return res.status(200).json({ message: 'Settings saved', settings });
  } catch (e) {
    Logger.error(`Error saving settings for user ${userID}: ${e.message}`);
    return res.status(500).json({ message: 'Error saving settings' });
  }
};
