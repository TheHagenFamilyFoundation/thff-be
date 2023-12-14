import bcrypt from 'bcrypt';
import { validationResult } from "express-validator";
import jwt from 'jsonwebtoken';

import Config from '../../config/config.js';
import { User, UserSetting, Token } from '../../models/index.js'

import Logger from "../../utils/logger.js";
import { generateCode, saltRounds } from "../../utils/util.js"

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

    if (!user.confirmed) {
      Logger.error('User Not Confirmed');
      return res
        .status(400)
        .json({ code: "USER005", message: "User Not Confirmed" });
    }

    const valid = await bcrypt.compare(password, user.encryptedPassword);

    if (!valid) {
      Logger.error('Invalid Password');
      return res
        .status(400)
        .json({ code: "USER004", message: "Error Logging In User" });
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

    const token = await jwt.sign({ accessLevel: user.accessLevel, id: user.id }, process.env.TOKEN_SECRET, { expiresIn: process.env.TOKEN_EXPRATION });
    //store token in db
    await Token.create({ userID: user._id, token, token_type: 'verification' });

    //return with user model, token and user settings
    return res.status(200).send({
      user,
      token,
      userSettings,
    });
  } catch (e) {
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
    password
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

    Logger.verbose(`Creating User with ${email}`)
    //create new user
    const createdUser = await User.create(newUser);
    if (!createdUser) {
      Logger.error(`Error Registering user with email - ${email}`)
      return res
        .status(500)
        .json({ code: "USER002", message: "Error Creating User" });
    }

    //send Email
    //TODO: Registration Email send here

    let message = 'User created';
    return res.status(200).send({ message });
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
//TODO:
//refreshAccessToken
export const refreshAccessToken = async (req, res) => {
  Logger.info('Inside - refreshAccessToken');

  try {
    // Get the access token
    const { accessToken, user } = req.body;
    const parsedUser = JSON.parse(user);

    const verifiedToken = await jwt.verify(accessToken, process.env.TOKEN_SECRET);

    if (!verifiedToken) {
      return res.status(401).json({ err: "Invalid Token!" });
    }

    let settingsQuery = {
      userID: parsedUser._id,
    };

    //find the settings
    let userSettings = await UserSetting.findOne(settingsQuery);

    if (!userSettings) {
      //create settings

      let defaultSettings = {
        scheme: "light",
        userID: parsedUser._id,
      };
      // If user logged in successfuly we return user, token, and settings as response
      userSettings = await UserSetting.create(defaultSettings);
    }

    const token = await jwt.sign({ accessLevel: user.accessLevel, id: user.id }, process.env.TOKEN_SECRET, { expiresIn: process.env.TOKEN_EXPRATION });
    //store token in db
    await Token.create({ userID: user._id, token, token_type: 'verification' });

    //return with user model, token and user settings
    return res.status(200).send({
      user,
      token,
      userSettings,
    });
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
    //find user check
    let emailFound = await User.find({ email });

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

    //TODO: Send Email
    let resetURL = Config.feURL + `${Config.feURL}/reset-password?rc=${newCode}`;
    Logger.info(`resetURL = ${resetURL}`);
    // await sails.helpers.sendTemplateEmail.with({
    //   to: user.email,
    //   subject: "THFF: Reset Password Email",
    //   template: "email-reset-password",
    //   templateData: {
    //     Name: user.email,
    //     resetCode: newCode,
    //     resetURL: `${resetURL}/reset-password?rc=${newCode}`,
    //   },
    //   layout: false,
    // });

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
