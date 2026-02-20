import Logger from '../../utils/logger.js';
import { ReferralCode, User } from '../../models/index.js';
import { generateCode } from '../../utils/util.js';

export const createReferralCode = async (req, res) => {
  Logger.info('Inside createReferralCode');

  try {
    const { decoded } = req;

    // Only directors (2+) can create referral codes
    if (decoded.accessLevel < 2) {
      return res.status(403).json({ message: 'Only directors can create referral codes' });
    }

    const { label } = req.body;

    const code = generateCode();

    const referralCode = await ReferralCode.create({
      code,
      director: decoded.userID,
      label: label || '',
    });

    const populated = await ReferralCode.findOne({ _id: referralCode._id })
      .populate('director', 'email firstName lastName');

    Logger.info(`Referral code created: ${code} by director ${decoded.userID}`);
    return res.status(200).json(populated);
  } catch (e) {
    Logger.error(`Error creating referral code: ${e.message}`);
    return res.status(500).json({ message: 'Error creating referral code' });
  }
};

export const getMyReferralCodes = async (req, res) => {
  Logger.info('Inside getMyReferralCodes');

  try {
    const { decoded } = req;

    const codes = await ReferralCode.find({ director: decoded.userID })
      .populate('director', 'email firstName lastName')
      .sort({ createdAt: -1 });

    return res.status(200).json(codes);
  } catch (e) {
    Logger.error(`Error getting referral codes: ${e.message}`);
    return res.status(500).json({ message: 'Error getting referral codes' });
  }
};

export const deactivateReferralCode = async (req, res) => {
  Logger.info('Inside deactivateReferralCode');

  try {
    const { decoded } = req;
    const { id } = req.params;

    const referralCode = await ReferralCode.findOne({ _id: id, director: decoded.userID });

    if (!referralCode) {
      return res.status(404).json({ message: 'Referral code not found' });
    }

    referralCode.active = !referralCode.active;
    await referralCode.save();

    Logger.info(`Referral code ${referralCode.code} toggled to active: ${referralCode.active}`);
    return res.status(200).json(referralCode);
  } catch (e) {
    Logger.error(`Error toggling referral code: ${e.message}`);
    return res.status(500).json({ message: 'Error toggling referral code' });
  }
};

export const getMySponsor = async (req, res) => {
  Logger.info('Inside getMySponsor');

  try {
    const { decoded } = req;
    const user = await User.findOne({ _id: decoded.userID });

    if (!user || !user.referralCode) {
      return res.status(200).json({ hasSponsor: false });
    }

    const referralCode = await ReferralCode.findOne({ code: user.referralCode })
      .populate('director', 'email firstName lastName');

    if (!referralCode) {
      return res.status(200).json({ hasSponsor: false });
    }

    return res.status(200).json({
      hasSponsor: true,
      code: referralCode.code,
      sponsor: {
        name: `${referralCode.director.firstName} ${referralCode.director.lastName}`,
        email: referralCode.director.email,
      },
    });
  } catch (e) {
    Logger.error(`Error getting user sponsor: ${e.message}`);
    return res.status(500).json({ message: 'Error getting sponsor info' });
  }
};

export const setMyReferralCode = async (req, res) => {
  Logger.info('Inside setMyReferralCode');

  try {
    const { decoded } = req;
    const { code } = req.body;

    if (!code) {
      // Clear referral code
      await User.updateOne({ _id: decoded.userID }, { $unset: { referralCode: 1 } });
      return res.status(200).json({ cleared: true });
    }

    const refCode = await ReferralCode.findOne({ code, active: true })
      .populate('director', 'email firstName lastName');

    if (!refCode) {
      return res.status(404).json({ message: 'Invalid or expired referral code' });
    }

    await User.updateOne({ _id: decoded.userID }, { referralCode: code });

    Logger.info(`User ${decoded.userID} set referral code to ${code}`);

    return res.status(200).json({
      code: refCode.code,
      sponsor: {
        name: `${refCode.director.firstName} ${refCode.director.lastName}`,
        email: refCode.director.email,
      },
    });
  } catch (e) {
    Logger.error(`Error setting referral code: ${e.message}`);
    return res.status(500).json({ message: 'Error setting referral code' });
  }
};

export const validateReferralCode = async (req, res) => {
  Logger.info('Inside validateReferralCode');

  try {
    const { code } = req.params;

    const referralCode = await ReferralCode.findOne({ code, active: true })
      .populate('director', 'email firstName lastName');

    if (!referralCode) {
      return res.status(404).json({ message: 'Invalid or expired referral code' });
    }

    return res.status(200).json({
      valid: true,
      directorName: `${referralCode.director.firstName} ${referralCode.director.lastName}`,
    });
  } catch (e) {
    Logger.error(`Error validating referral code: ${e.message}`);
    return res.status(500).json({ message: 'Error validating referral code' });
  }
};
