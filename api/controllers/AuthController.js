/**
 * AuthController
 *
 * @description :: Server-side logic for managing auths
 * @help        :: See http://links.sailsjs.org/docs/controllers
 */

const bcrypt = require("bcrypt-nodejs");

const saltRounds = 10;

module.exports = {
  login(req, res) {
    sails.log("User trying to login... email: ", req.body.email);

    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({
        err: "email and password required",
        message: "Email and Password required",
      });
    }

    const message = {
      err: "invalid email or password",
      message: "Invalid Email or Password",
    };

    const query = {};
    query.email = email.toLowerCase();
    // query.confirmed = true; //check for confirmation

    // sails.log.debug(query);

    User.findOne(query, (err, user) => {
      if (!user) {
        return res.status(400).json({
          err: "invalid email or password",
          message: "Invalid Email or Password",
        });
      }

      if (user.length > 1) {
        sails.log.error("error");
        sails.log.error(err);
      }

      if (user.confirmed) {
        User.comparePassword(password, user, (err2, valid) => {
          if (err2) {
            return res.status(err2.status).json({ err: "forbidden" });
          }

          if (!valid) {
            sails.log.debug("error not valid password");
            sails.log.debug("returning ", message);
            return res.status(400).json(message);
          }

          sails.log.debug("success");

          return res.status(200).json({
            user,
            token: jwToken.issue({ id: user.id }),
          });
        });
      } else {
        sails.log("user not confirmed");
        message.err =
          "User is not confirmed. Please check your email for confirmation email.";
        message.message =
          "User is not confirmed. Please check your email for confirmation email.";
        return res.status(400).json(message);
      }
    });
  },

  authTest(req, res) {
    sails.log("AuthTest");

    return res.status(200).json({
      employees: [
        { firstName: "John", lastName: "Doe" },
        { firstName: "Anna", lastName: "Smith" },
        { firstName: "Peter", lastName: "Jones" },
      ],
    });
  },

  async forgotPassword(req, res) {
    sails.log("User forgot password... email: ", req.body);

    //generate code
    User.find({
      email: req.body.email,
    }).exec(async (err, emailfound) => {
      if (err) {
        return res.status(err.status).json({ err });
      }

      if (emailfound && emailfound.length > 0) {
        sails.log("email is found");
        // debug
        sails.log(emailfound[0].id);
        sails.log(emailfound);

        let user = emailfound[0];

        let newCode = generateCode();

        //get date
        const now = new Date();

        //can remove
        sails.log(now);

        User.update(
          { id: user.id },
          {
            resetCode: newCode,
            resetPassword: true,
            resetTime: now,
          }
        ).exec(async () => {
          //TODO: make verbose
          sails.log("user", user);
          sails.log("user.email", user.email);
          sails.log("user.username", user.username);
          sails.log("user.resetCode", newCode);

          if (sails.config.environment === "production") {
            resetURL = process.env.FE_API;
          } else {
            resetURL = "http://localhost:4200";
          }

          await sails.helpers.sendTemplateEmail.with({
            to: user.email,
            subject: "THFF: Reset Password Email",
            template: "email-reset-password",
            templateData: {
              Name: user.username,
              resetCode: newCode,
              resetURL: `${resetURL}/reset-password?rc=${newCode}`,
            },
            layout: false,
          });

          let message = `forgot password ${req.body.email}`;
          return res.status(200).json(message);
        });
      } else {
        sails.log("email is not found");
        return res.status(401).json({ resetCodeCreated: false });
      }
    });
    //send email

    // return res.status(200).json(message);
  },

  async signUp(req, res) {
    sails.log("sign up - req.body", req.body);

    //check if email is already taken
    const userfound = await sails.helpers.user.userEmailExists(req.body.email);

    if (!userfound) {
      req.body.email = req.body.email.toLowerCase();

      bcrypt.genSalt(saltRounds, (err, salt) => {
        if (err) return res.status(err.status).json({ err });

        bcrypt.hash(req.body.password, salt, null, (err2, hash) => {
          if (err2) return res.status(err2.status).json({ err2 });

          req.body.encryptedPassword = hash;

          //create confirm code and add to the user object
          req.body.confirmCode = generateCode();

          User.create(req.body).exec(async (err3, user) => {
            if (err3) {
              sails.log.error(err3);
            }

            sails.log.debug("user created: ");
            sails.log.debug(user);

            // If user created successfuly we return user and token as response
            if (user) {
              // NOTE: payload is { id: user.id}

              if (sails.config.environment === "production") {
                resetURL = process.env.FE_API;
              } else {
                resetURL = "http://localhost:4200";
              }

              //send email
              await sails.helpers.sendTemplateEmail.with({
                to: user.email,
                subject: "THFF Account Confirmation",
                template: "email-register-confirm",
                templateData: {
                  email: user.email,
                  resetURL: `${resetURL}/confirmation?code=${user.confirmCode}`,
                  // To: email.to
                  // fullName: inputs.fullName,
                  // token: newUserRecord.emailProofToken
                },
                layout: false,
              });

              let message = "User created";
              res.status(200).json({ message });
            }
          });
        });
      });
    } else {
      return res
        .status(400)
        .json({ code: "USER001", message: "Duplicate User" });
    }

    // return res.status(200).json(req.body);
  },
  async confirmUser(req, res) {
    //debug
    sails.log("confirmUser", req.body);

    //search the unconfirmed
    //check code
    User.find({
      confirmed: false,
      confirmCode: req.body.confirmCode,
    }).exec(async (err, userfound) => {
      sails.log(userfound);

      if (userfound && userfound.length > 0) {
        //update the user confirmed field
        User.update(
          { id: userfound[0].id },
          {
            confirmed: true,
          }
        ).exec(async () => {
          sails.log("confirming");
          let message = `Account confirmed`;
          return res.status(200).json({ message });
        });
      } else {
        let message = `Account already confirmed`;
        return res.status(200).json({ message });
      }
    });
  },
};
//TODO: move to utils
function generateCode() {
  let code = "";
  const possible =
    "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";

  for (let i = 0; i < 5; i += 1) {
    code += possible.charAt(Math.floor(Math.random() * possible.length));
  }

  //TODO: verbose
  sails.log(code);

  return code;
}
