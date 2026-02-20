import bcrypt from 'bcrypt';
import { validationResult } from "express-validator";
import jwt from 'jsonwebtoken';

import Config from '../../config/config.js';
import Logger from "../../utils/logger.js";
import { generateCode, saltRounds } from "../../utils/util.js"
//email
import { sendEmailWithTemplate } from '../email/email.js';
import { createNewPassword, registerUser, resetPasswordConfirm } from '../../views/user.js';

import { User, UserSetting, Token, Invite, Organization, ReferralCode } from '../../models/index.js'

export const login = async (req, res) => {
  Logger.verbose('Inside Login');

  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    Logger.error(`We have Errors: ${errors.array()}`)
    return res.status(422).json({ error: errors.array() });
  }
  const { email, password } = req.body;
  Logger.info(`User trying to login... email: ${email}`);
  try {
    const query = {
      email: email.toLowerCase()
    }

    const user = await User.findOne(query);

    if (!user) {
      Logger.error('User Not Found');
      return res
        .status(400)
        .json({ code: "USER004", message: "Error Logging In User" });
    }

    //not used right now
    // if (!user.confirmed) {
    //   Logger.error('User Not Confirmed');
    //   return res
    //     .status(400)
    //     .json({ code: "USER005", message: "User Not Confirmed" });
    // }

    if (!user.encryptedPassword) {
      Logger.error('user does not have an encrypted password');

      let newCode = generateCode();
      Logger.info(`newCode ${newCode}`);
      //get date
      const now = new Date();

      //can remove
      Logger.info(`date: ${now}`);

      await User.updateOne(
        { _id: user._id },
        {
          resetCode: newCode,
          resetPassword: true,
          resetTime: now,
        }
      );

      // Ensure URL has protocol for proper email link rendering
      // Default to https for non-localhost, http for localhost
      let feURL = Config.feURL;
      if (!feURL.startsWith('http://') && !feURL.startsWith('https://')) {
        feURL = feURL.includes('localhost') ? `http://${feURL}` : `https://${feURL}`;
      }
      let resetLink = `${feURL}/reset-password?rc=${newCode}`;
      Logger.info(`resetLink = ${resetLink}`);
      const data = {
        email: user.email,
        resetLink
      };
      console.log('data', data);

      const to = user.email;
      const subject = 'THFF: Create New Password';

      try {
        await sendEmailWithTemplate(to, subject, createNewPassword, data);
        Logger.info(`Create new password email sent successfully to ${to}`);
      } catch (emailError) {
        Logger.error(`Failed to send create new password email to ${to}:`, emailError);
        // Continue even if email fails - user still needs to set password
      }

      return res.status(200).json({ newPassword: true, message: "User Needs New Password" })

    }

    const valid = await bcrypt.compare(password, user.encryptedPassword);

    if (!valid) {
      Logger.error('Invalid Password');
      return res
        .status(400)
        .json({ code: "USER004", message: "Error Logging In User" }); // don't reveal wrong password
    }

    let userSettings = await UserSetting.findOne({ userID: user._id });

    if (!userSettings) {
      //create settings
      let defaultSettings = {
        scheme: "light",
        userID: user._id,
      };

      userSettings = await UserSetting.create(defaultSettings);

    }

    Logger.verbose(`Logging in user ${email} with accessLevel ${user.accessLevel}`);

    const token = jwt.sign(
      {
        accessLevel: user.accessLevel,
        userID: user._id
      },
      process.env.TOKEN_SECRET,
      { expiresIn: process.env.TOKEN_EXPIRATION });

    //store token in db
    await Token.create({ userID: user._id, token, token_type: 'verification' });

    //return with user model, token and user settings
    const payload = {
      user,
      token,
      userSettings,
    }

    return res.status(200).send(payload);
  } catch (e) {
    console.log(e);
    Logger.error(`Error Logging In User with email - ${email}`)
    return res
      .status(500)
      .json({ code: "USER004", message: "Error Logging In User" });
  }
}

export const register = async (req, res) => {
  Logger.verbose('Inside Register');

  const {
    email,
    password,
    referralCode
  } = req.body;

  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(422).json({ error: errors.array() });
  }

  try {
    let users = await User.find({ email: email.toLowerCase() });

    if (users.length > 0) {
      Logger.error("Duplicate Email");
      return res
        .status(400)
        .json({ code: "USER001", message: "Duplicate User" });

    }

    //hash the password
    const passwordSalt = await bcrypt.genSalt(saltRounds);
    const encryptedPassword = await bcrypt.hash(password, passwordSalt);

    const newUser = {
      email: email.toLowerCase(),
      encryptedPassword,
      confirmCode: generateCode()
    };

    // Persist referral code on the user record if provided and valid
    if (referralCode) {
      const validRef = await ReferralCode.findOne({ code: referralCode, active: true });
      if (validRef) {
        newUser.referralCode = referralCode;
        Logger.info(`User ${email} registered with referral code ${referralCode}`);
      }
    }

    Logger.verbose(`Creating User with ${email}`)
    //create new user
    const createdUser = await User.create(newUser);
    if (!createdUser) {
      Logger.error(`Error Registering user with email - ${email}`)
      return res
        .status(500)
        .json({ code: "USER002", message: "Error Creating User" });
    }

    // Auto-fulfill pending organization invites for this email
    try {
      const pendingInvites = await Invite.find({ email: email.toLowerCase(), status: 'pending' });

      for (const invite of pendingInvites) {
        const org = await Organization.findOne({ _id: invite.organization });
        if (org && !org.users.some(u => u.toString() === createdUser._id.toString())) {
          org.users.push(createdUser._id);
          await org.save();

          createdUser.organizations.push(org._id);

          invite.status = 'accepted';
          await invite.save();

          Logger.info(`Auto-fulfilled invite: added ${email} to organization ${org.name}`);
        }
      }

      if (pendingInvites.length > 0) {
        await createdUser.save();
      }
    } catch (inviteError) {
      Logger.error(`Error fulfilling pending invites for ${email}: ${inviteError.message}`);
      // Don't fail registration if invite fulfillment fails
    }

    // Send welcome email (non-blocking)
    const data = {
      email: createdUser.email,
      loginLink: `${Config.feURL}/pages/auth/login`,
      userPageLink: `${Config.feURL}/pages/user`,
    };

    const to = createdUser.email;
    const subject = 'THFF: Thank You For Registering';

    try {
      await sendEmailWithTemplate(to, subject, registerUser, data);
      Logger.info(`Registration email sent successfully to ${to}`);
    } catch (emailError) {
      Logger.error(`Failed to send registration email to ${to}:`, emailError);
      // Continue even if email fails - user is still created
    }

    // Create default user settings
    let userSettings = await UserSetting.create({
      scheme: 'light',
      userID: createdUser._id,
    });

    // Generate JWT token (same as login)
    const token = jwt.sign(
      {
        accessLevel: createdUser.accessLevel,
        userID: createdUser._id
      },
      process.env.TOKEN_SECRET,
      { expiresIn: process.env.TOKEN_EXPIRATION }
    );

    // Store token in db
    await Token.create({ userID: createdUser._id, token, token_type: 'verification' });

    Logger.info(`User registered and auto-logged in: ${email}`);

    // Return same payload shape as login
    const payload = {
      user: createdUser,
      token,
      userSettings,
    };

    return res.status(200).send(payload);
  } catch (e) {
    Logger.error(`Error Registering user with email - ${email}`)
    return res
      .status(500)
      .json({ code: "USER002", message: "Error Creating User" });
  }
}

export const confirmUser = async (req, res) => {
  try {
    Logger.verbose('Inside Confirm User');

    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(422).json({ error: errors.array() });
    }

    const { confirmCode } = req.body;
    const user = await User.find({
      confirmed: false,
      confirmCode
    })

    if (!user || user.length > 1) {
      Logger.error('User Not Found');
      return res
        .status(400)
        .json({ code: "USER003", message: "Error Confirming User" });
    }

    const updatedUser = await User.updateOne({ _id: user[0]._id }, { confirmed: true });

    if (!updatedUser) {
      Logger.error(`Error Updating User ${user.email}`);
      return res
        .status(400)
        .json({ code: "USER003", message: "Error Confirming User" });
    }

    let message = 'Account Confirmed';
    return res.status(200).send({ message });
  } catch (e) {
    Logger.error('Error Confirming User');
    return res
      .status(500)
      .json({ code: "USER003", message: "Error Confirming User" });
  }
}
//refreshAccessToken
// Accepts tokens that are still valid OR expired within a grace window (24 hours).
// This enables sliding sessions — active users stay logged in indefinitely,
// while inactive sessions expire after the grace period.
export const refreshAccessToken = async (req, res) => {
  Logger.info('Inside - refreshAccessToken');

  const REFRESH_GRACE_PERIOD_HOURS = 24;

  try {
    // Get the access token
    const { accessToken } = req.body;

    // Verify token but allow expired tokens (we'll check the grace window manually)
    let decodedToken;
    try {
      decodedToken = jwt.verify(accessToken, process.env.TOKEN_SECRET, { ignoreExpiration: true });
    } catch (err) {
      Logger.error('Token verification failed (invalid signature or malformed)');
      return res.status(401).json({ err: "Invalid Token!" });
    }

    if (!decodedToken) {
      Logger.error('Invalid Token');
      return res.status(401).json({ err: "Invalid Token!" });
    }

    // Check if the token expired beyond the grace window
    if (decodedToken.exp) {
      const now = Math.floor(Date.now() / 1000);
      const expiredAgoSeconds = now - decodedToken.exp;
      const graceSeconds = REFRESH_GRACE_PERIOD_HOURS * 60 * 60;

      if (expiredAgoSeconds > graceSeconds) {
        Logger.error(`Token expired ${expiredAgoSeconds}s ago, beyond ${REFRESH_GRACE_PERIOD_HOURS}h grace period`);
        return res.status(401).json({ err: "Token expired beyond refresh window. Please sign in again." });
      }
    }

    const { userID } = decodedToken;

    //find the user
    const user = await User.findOne({ _id: userID });

    if (!user) {
      Logger.error(`Could not find user ${userID}`);
      return res.status(401).json({ err: "Invalid Token!" });
    }

    let settingsQuery = {
      userID: user._id,
    };

    //find the settings
    let userSettings = await UserSetting.findOne(settingsQuery);

    if (!userSettings) {
      //create settings

      let defaultSettings = {
        scheme: "light",
        userID: user._id,
      };
      // If user logged in successfully we return user, token, and settings as response
      userSettings = await UserSetting.create(defaultSettings);
    }

    const token = jwt.sign(
      {
        accessLevel: user.accessLevel,
        userID: user._id
      },
      process.env.TOKEN_SECRET,
      { expiresIn: process.env.TOKEN_EXPIRATION });

    //store token in db
    await Token.create({ userID: user._id, token, token_type: 'verification' });

    Logger.info('Refreshed Token Successfully');

    //return with user model, token and user settings
    const payload = {
      user,
      token,
      userSettings,
    }

    return res.status(200).send(payload);
  } catch (e) {
    Logger.error('Error Refreshing Token')
    return res
      .status(500)
      .json({ code: "TOK002", message: "Error Refreshing Token" });
  }
}

//forgotPassword
export const forgotPassword = async (req, res) => {

  const { email } = req.body;

  Logger.info(`User forgot password... email: ${email}`);

  try {

    //generate code
    //find user check (normalize email to lowercase for consistency)
    let emailFound = await User.find({ email: email.toLowerCase() });

    //Don't tell them an email doesn't exist
    if (!emailFound || emailFound.length < 1) {
      Logger.info("EMAIL001 - Email not found.");
      let message = `forgot password ${email}`;
      return res.status(200).json(message);
    }

    Logger.debug("email is found");
    // debug
    Logger.debug(`user id  ${emailFound[0]._id}`);
    Logger.debug(`emailFound array: ${emailFound}`);

    let user = emailFound[0];
    Logger.verbose(`user: ${user}`);

    let newCode = generateCode();
    Logger.info(`newCode ${newCode}`);
    //get date
    const now = new Date();

    //can remove
    Logger.info(`date: ${now}`);

    let updatedUser = await User.updateOne(
      { _id: user._id },
      {
        resetCode: newCode,
        resetPassword: true,
        resetTime: now,
      }
    );

    Logger.verbose(`user updated ${updatedUser}`);

    Logger.verbose(`user.email = ${user.email}`);
    Logger.verbose(`user.username =  ${user.username}`);
    Logger.verbose(`user.resetCode = ${newCode}`);

    // Ensure URL has protocol for proper email link rendering
    // Default to https for non-localhost, http for localhost
    let feURL = Config.feURL;
    if (!feURL.startsWith('http://') && !feURL.startsWith('https://')) {
      feURL = feURL.includes('localhost') ? `http://${feURL}` : `https://${feURL}`;
    }
    let resetLink = `${feURL}/reset-password?rc=${newCode}`;
    Logger.info(`resetLink = ${resetLink}`);
    const data = {
      email: user.email,
      resetLink
    };
    console.log('data', data);

    const to = user.email;
    const subject = 'THFF: Reset Password';

    try {
      await sendEmailWithTemplate(to, subject, createNewPassword, data);
      Logger.info(`Password reset email sent successfully to ${to}`);
    } catch (emailError) {
      Logger.error(`Failed to send password reset email to ${to}:`, emailError);
      // Still return success to user for security (don't reveal if email exists)
      // But log the error for debugging
    }

    let message = `forgot password ${email}`;

    return res.status(200).json(message);
  }
  catch (e) {
    Logger.error('Error Processing Forgot Password')
    return res
      .status(500)
      .json({ code: "TOK002", message: "Error Processing Forgot Password" });
  }
};

export const setNewPassword = async (req, res) => {

  console.log('inside setNewPassword');

  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    Logger.error(`We have Errors: ${errors.array()}`)
    return res.status(422).json({ error: errors.array() });
  }

  try {
    const newPassword = req.body.np;
    const resetCode = req.body.rc; // reset code
    const users = await User.find({ resetCode });

    if (!users) {
      Logger.error('User Not Found');
      return res
        .status(400)
        .json({ code: "USER006", message: "Error Resetting User Password" });
    }

    if (users.length > 1) {
      Logger.error('Duplicate Reset Codes');
      //uh oh
      return res
        .status(400)
        .json({ code: "USER009", message: "Duplicate Reset Code" });
    }
    const user = users[0]; //should be first
    console.log('user', user); //may be an array

    Logger.info(`Setting new password for user ${user._id}`);

    const now = new Date();
    const TWENTYFOUR_HOURS = 60 * 60 * 1000 * 24;

    if (!(now - user.resetTime < TWENTYFOUR_HOURS)) {
      console.log("reset time is invalid");
      Logger.error('Reset Time is Invalid');
      return res
        .status(400)
        .json({ code: "USER0008", message: "Reset Time is Invalid" });
    }

    //hash the password
    const passwordSalt = await bcrypt.genSalt(saltRounds);
    const encryptedPassword = await bcrypt.hash(newPassword, passwordSalt);

    await User.updateOne({ _id: user._id }, { encryptedPassword, resetPassword: false });

    Logger.info('Reset Password Successful');

    //send email
    const data = {
      email: user.email,
    };
    console.log('data', data);

    const to = user.email;
    const subject = 'THFF: Reset Password Confirm';

    try {
      await sendEmailWithTemplate(to, subject, resetPasswordConfirm, data);
      Logger.info(`Password reset confirmation email sent successfully to ${to}`);
    } catch (emailError) {
      Logger.error(`Failed to send password reset confirmation email to ${to}:`, emailError);
      // Continue even if email fails - password is still reset
    }

    return res
      .status(200)
      .json({ reset: true, message: "Reset Successful" });

  } catch (e) {
    Logger.error('Error Creating New Password')
    return res
      .status(500)
      .json({ code: "USER007", message: "Error Creating New Password" });
  }

}
