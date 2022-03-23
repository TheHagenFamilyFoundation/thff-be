/**
 * AuthController
 *
 * @description :: Server-side logic for managing auths
 * @help        :: See http://links.sailsjs.org/docs/controllers
 */

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

    const query = {};
    query.email = email.toLowerCase();

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

      User.comparePassword(password, user, (err2, valid) => {
        if (err2) {
          return res.status(err2.status).json({ err: "forbidden" });
        }

        if (!valid) {
          sails.log.debug("error not valid password");
          const message = {
            err: "invalid email or password",
            message: "Invalid Email or Password",
          };
          sails.log.debug("returning ", message);
          return res.status(400).json(message);
        }

        sails.log.debug("success");

        return res.status(200).json({
          user,
          token: jwToken.issue({ id: user.id }),
        });
      });
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

  resetCodeCheck(req, res) {
    sails.log("req.query", req.query.rc);
    //debug

    let testQuery = {
      resetCode: req.query.rc,
    };

    sails.log("testQuery", testQuery);
    let message = `reset code = ${req.query.rc}`;
    return res.status(401).json(message);
    // User.find({
    //   resetCode: req.query.rc,
    // }).exec((err, validResetCode) => {
    //   if (err) {
    //     return res.status(err.status).json({ err });
    //   }

    //   sails.log("validResetCode", validResetCode.length);

    //   if (validResetCode && validResetCode.length > 0) {
    //     sails.log("reset code is valid"); // reset code was found

    //     // //TODO:debug
    //     let message = `reset code = ${req.query.rc}`;
    //     return res.status(401).json(message);

    //     // sails.log("reset code is invalid");
    //     // return res
    //     //   .status(200)
    //     //   .json({ validResetCode: false, message: "Reset code is invalid." });

    //     //     if (validResetCode[0].resetPassword) {
    //     //       // set in the db the resetPassword to false
    //     //       User.update(
    //     //         {
    //     //           resetCode: req.query.resetCode,
    //     //         },
    //     //         {
    //     //           resetPassword: false,
    //     //         }
    //     //       ).exec((err2, user) => {
    //     //         if (err2) {
    //     //           return res.status(err2.status).json({ reset: false });
    //     //         }

    //     //         // now for checking the resetTime

    //     //         const now = new Date();
    //     //         const TWENTYFOUR_HOURS = 60 * 60 * 1000 * 24;

    //     //         sails.log(now);
    //     //         sails.log(user[0].resetTime);
    //     //         sails.log(TWENTYFOUR_HOURS);

    //     //         if (now - user[0].resetTime < TWENTYFOUR_HOURS) {
    //     //           sails.log("reset time is valid");

    //     //           return res.status(200).json({
    //     //             user: user[0],
    //     //             validResetCode: true,
    //     //             message: "reset time is valid",
    //     //           });
    //     //         }

    //     //         sails.log("reset time is invalid");

    //     //         // reset time is invalid
    //     //         return res.status(401).json({
    //     //           validResetCode: false,
    //     //           message: "Reset password link has expired. Please try again.",
    //     //         });
    //     //       });
    //     //     } else {
    //     //       // resetPassword is false
    //     //       return res.status(401).json({
    //     //         validResetCode: false,
    //     //         message: "Reset code has already been used. Please try again.",
    //     //       });
    //     //     }
    //   } else {
    //     sails.log("reset code is invalid");
    //     return res
    //       .status(401)
    //       .json({ validResetCode: false, message: "Reset code is invalid." });
    //   }
    // });

    // let message = `reset code = ${req.query.rc}`;
    // return res.status(200).json(message);
  }, // end of resetCodeCheck
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
