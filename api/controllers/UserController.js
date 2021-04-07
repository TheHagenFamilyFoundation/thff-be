/**
 * UserController
 *
 * @description :: Server-side logic for managing users
 * @help        :: See http://links.sailsjs.org/docs/controllers
 */

const bcrypt = require('bcrypt-nodejs');

const saltRounds = 10;

module.exports = {
  async create(req, res) {
    sails.log('user create');

    // const userfound = await sails.helpers.user.userNameExists(req.body.username);
    const userfound = await sails.helpers.user.userEmailExists(req.body.email);

    if (!userfound) {
      if (req.body.password !== req.body.confirmPassword) {
        return res.status(401).json({ err: 'Password doesn\'t match, What a shame!' });
      }

      sails.log('req.body', req.body);

      req.body.email = req.body.email.toLowerCase();

      sails.log('after email update req.body', req.body);
      bcrypt.genSalt(saltRounds, (err, salt) => {
        if (err) return res.status(err.status).json({ err });

        bcrypt.hash(req.body.password, salt, null, (err2, hash) => {
          if (err2) return res.status(err2.status).json({ err2 });

          sails.log('hash', hash);

          req.body.encryptedPassword = hash;

          sails.log('req.body', req.body);

          User.create(req.body).exec((err3, user) => {
            if (err3) { sails.log.error(err3); }

            if (err3) {
              return res.status(409).json({ err3 });
            }

            sails.log.debug('user created: ');

            // If user created successfuly we return user and token as response
            if (user) {
              // NOTE: payload is { id: user.id}
              res.status(200).json({ user, token: jwToken.issue({ id: user.id }) });
            }
          });
        });
      });
    } else {
      return res.status(400).json({ code: 'USER001', message: 'Duplicate User' });
    }
  },

  async UserNameExists(req, res) {
    sails.log(req.query.username);

    // in the user folder for helpers
    const userfound = await sails.helpers.user.userNameExists(req.query.username);

    sails.log(userfound);

    if (userfound) {
      sails.log('user is found');
      return res.status(200).json({ userfound: true });
    }

    sails.log('user is not found');
    return res.status(200).json({ userfound: false });
  }, // end of UserNameExists

  async EmailExists(req, res) {
    sails.log(req.query.email);

    // helpers
    // user folder
    const emailfound = await sails.helpers.user.userEmailExists(req.query.email);

    sails.log(emailfound);

    if (emailfound) {
      sails.log('email is found');
      return res.status(200).json({ emailfound: true });
    }

    sails.log('email is not found');
    return res.status(200).json({ emailfound: false });
  }, // end of EmailExists

  CreateResetCode(req, res) {
    sails.log('Create Reset Code');

    const user = req.body;

    User.find({
      email: user.email,
    }).exec((err, emailfound) => {
      if (err) {
        return res.status(err.status).json({ err });
      }

      if (emailfound) {
        if (emailfound.length > 0) {
          sails.log('email is found');
          // debug
          sails.log(emailfound[0].id);

          let text = '';
          const possible = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';

          for (let i = 0; i < 5; i += 1) {
            text += possible.charAt(Math.floor(Math.random() * possible.length));
          }

          sails.log(text);

          const now = new Date();

          sails.log(now);

          User.update(
            { id: emailfound[0].id },
            {
              // debug
              resetCode: text,
              resetPassword: true,
              resetTime: now,
            },
          )
            .exec((emailfound2) => {
              sails.log(emailfound2);
              return res.status(200).json({ resetCodeCreated: true, resetCode: text });
            });
        } else {
          sails.log('email is not found');
          return res.status(401).json({ resetCodeCreated: false });
          // res.send(404);
        }
      }// end of emailfound if
    });
  }, // end of CreateResetCode
  ResetCodeCheck(req, res) {
    sails.log(req.query.resetCode);

    User.find({
      resetCode: req.query.resetCode,
    }).exec((err, validresetCode) => {
      if (err) {
        return res.status(err.status).json({ err });
      }

      if (validresetCode) {
        if (validresetCode.length > 0) {
          sails.log('reset code is valid'); // reset code was found

          if (validresetCode[0].resetPassword) {
            // set in the db the resetPassword to false
            User.update({
              resetCode: req.query.resetCode,
            }, {
              resetPassword: false,
            }).exec((err2, user) => {
              if (err2) {
                return res.status(err2.status).json({ reset: false });
              }

              // now for checking the resetTime

              const now = new Date();
              const TWENTYFOUR_HOURS = 60 * 60 * 1000 * 24;

              sails.log(now);
              sails.log(user[0].resetTime);
              sails.log(TWENTYFOUR_HOURS);

              if (now - user[0].resetTime < TWENTYFOUR_HOURS) {
                sails.log('reset time is valid');

                return res.status(200).json({ user: user[0], validresetCode: true, message: 'reset time is valid' });
              }


              sails.log('reset time is invalid');

              // reset time is invalid
              return res.status(401).json({ validresetCode: false, message: 'Reset password link has expired. Please try again.' });
            });
          } else {
            // resetPassword is false
            return res.status(401).json({ validresetCode: false, message: 'Reset code has already been used. Please try again.' });
          }
        } else {
          sails.log('reset code is invalid');
          return res.status(401).json({ validresetCode: false, message: 'Reset code is invalid.' });
        }
      }// end of resetCode if
    });
  }, // end of ResetCodeCheck
  async setNewPassword(req, res) {
    sails.log('setNewPassword',req.body);

    const newPassword = req.body.np;
    const username = req.body.un;
    const resetCode = req.body.rc; // reset code
    let user = null;

    User.find({
      resetCode,
    }).exec((err, validresetCode) => {
      if (err) {
        return res.status(err.status).json({ err });
      }

      if (validresetCode) {

        user = validresetCode[0];

        if (validresetCode.length > 0) {
          sails.log('reset code is valid'); // reset code was found
          sails.log('set new password - user',user)
          if (validresetCode[0].resetPassword) {
            // set in the db the resetPassword to false
            User.update({
              _id: user._id,
            }, {
              resetPassword: false,
            }).exec((err2, user) => {
              if (err2) {
                return res.status(err2.status).json({ reset: false });
              }

              // now for checking the resetTime

              const now = new Date();
              const TWENTYFOUR_HOURS = 60 * 60 * 1000 * 24;

              sails.log(now);
              sails.log(user[0].resetTime);
              sails.log(TWENTYFOUR_HOURS);

              if (now - user[0].resetTime < TWENTYFOUR_HOURS) {
                sails.log('reset time is valid');

                User.find({
                  _id: user._id,
                }).exec((err, user) => {
                  if (err) {
                    return res.status(err.status).json({ reset: false });
                  }
            
                  sails.log('bcrypt gen salting');
            
                  bcrypt.genSalt(10, (err2, salt) => {
                    if (err2) return next(err2);
            
                    bcrypt.hash(newPassword, salt, null, (err3, hash) => {
                      if (err3) return next(err3);
                      sails.log('new hash');
                      sails.log(hash);
            
                      // then set the user password to that hash
                      User.update({
                        id: user[0].id,
                      }, {
                        // resetPassword: false,
                        encryptedPassword: hash,
                      }).exec(async (err4) => {
                        if (err4) {
                          return res.status(err4.status).json({ reset: false });
                        }
            
                        // sails.log(user);
                        sails.log('Reset Successful');
            
                        sails.log('user[0]',user[0])
                        sails.log('user[0].email',user[0].email)
                        sails.log('user[0].username',user[0].username)
            
                        await sails.helpers.sendTemplateEmail.with({
                          to: user[0].email,
                          subject: 'Your THFF Password has Changed',
                          template: 'email-reset-password-confirm',
                          templateData: {
                            Name: user[0].username,
                            // To: email.to
                            // fullName: inputs.fullName,
                            // token: newUserRecord.emailProofToken
                          },
                          layout: false,
                        });
            
                        return res.status(200).json({ reset: true, message: 'Reset Successful' });
                      });
                    });
                  });
            
                });

                return res.status(200).json({ user: user[0], validresetCode: true, message: 'reset time is valid' });
              }

              sails.log('reset time is invalid');

              // reset time is invalid
              return res.status(401).json({ validresetCode: false, message: 'Reset password link has expired. Please try again.' });
            });
          } else {
            // resetPassword is false
            return res.status(401).json({ validresetCode: false, message: 'Reset code has already been used. Please try again.' });
          }
        } else {
          sails.log('reset code is invalid');
          return res.status(401).json({ validresetCode: false, message: 'Reset code is invalid.' });
        }
      }// end of resetCode if
    });

  }, // end of setNewPassword

  changePassword(req, res) {
    sails.log('changePassword');

    sails.log(req.body);

    const { currentPassword } = req.body;
    const { newPassword } = req.body;
    const { username } = req.body;

    User.find({
      username,
    }).exec((err, user) => {
      if (err) {
        return res.status(err).json({ change: false });
      }

      const encrypted = user[0].encryptedPassword;

      // compare current password to the current encrypted password
      // if match then encrypt the new password and set the encrypted new password as the password
      bcrypt.compare(currentPassword, encrypted, (err2, match) => {
        if (err2) {
          return res.status(err2.status).json({ change: false });
        }

        if (!match) {
          sails.log('match', match);

          const message = 'Current Password does not match.';
          return res.status(200).json({ change: false, message });
        }

        if (match) {
          sails.log('bcrypt gen salting');

          bcrypt.genSalt(10, (err3, salt) => {
            if (err3) return res.status(err3.status).json({ change: false });

            bcrypt.hash(newPassword, salt, null, (err4, hash) => {
              if (err4) return res.status(err4.status).json({ change: false });
              sails.log('new hash');
              sails.log(hash);

              // then set the user password to that hash
              User.update({
                id: user[0].id,
              }, {
                // resetPassword: false,
                encryptedPassword: hash,
              }).exec((err5) => {
                if (err5) {
                  return res.status(err5.status).json({ change: false });
                }

                // sails.log(user);
                sails.log('Change Password Successful');
                return res.status(200).json({ change: true, message: 'Change Password Successful' });
              });
            });
          });
        }
      });
    });
  }, // end of changePassword

  changeEmail(req, res) {
    sails.log('changeEmail');

    const newEmail = req.body.email;
    const { username } = req.body;

    sails.log('newEmail', newEmail);

    User.find({
      username,
    }).exec((err, user) => {
      if (err) {
        return res.status(err.status).json({ change: false });
      }

      // then set the user password to that hash
      User.update({
        id: user[0].id,
      }, {
        email: newEmail,
      }).exec((err2) => {
        if (err2) {
          return res.status(err2.status).json({ change: false });
        }

        // sails.log(user);
        sails.log('Change Email Successful');
        return res.status(200).json({ change: true, message: 'Change Email Successful' });
      });
    });
  }, // end of changeEmail

  updateName(req, res) {
    sails.log('updateName', req.body);

    const { firstName } = req.body;
    const { lastName } = req.body;
    const { id } = req.body;

    User.find({
      id,
    }).exec((err, user) => {
      if (err) {
        return res.status(err.status).json({ change: false });
      }

      // then set the user password to that hash
      User.update({
        id: user[0].id,
      }, {
        firstName,
        lastName,
      }).exec((err2) => {
        if (err2) {
          return res.status(err2.status).json({ change: false });
        }

        // sails.log(user);
        sails.log('Update Name Successful');
        return res.status(200).json({ change: true, message: 'Update Name Successful' });
      });
    });
  }, // end of updateName

  async getUserCounts(req, res) {
    sails.log('getUserCounts: ', req.query);

    // filter by organization
    if (req.query.org) {
      const org = await Organization.findOne({ id: req.query.org }).populate('users');
      sails.log('org', org);

      const orgUsers = org.users;
      orgUsersIds = [];
      org.users.forEach((element) => {
        orgUsersIds.push(element.id);
      });
      // then find all users, find the difference - complicated

      const allUsers = await User.find({ id: { '!=': orgUsersIds } });
      sails.log('allUsers', allUsers);

      var total = allUsers.length;

      // debug - keep
      sails.log('total user count = ', total);

      return res.status(200).json(total);
    }

    // generic total - all users
    var total = await User.count({});

    // debug - keep
    sails.log('total user count = ', total);

    return res.status(200).json(total);
  },

  // Gets
  // Blueprint Find - GET
  async find(req, res) {
    sails.log('get users req.query', req.query);

    // notorg is the filter

    // filter by organization
    if (req.query.notorg) {
      const org = await Organization.findOne({ id: req.query.notorg }).populate('users');
      sails.log('org', org);

      const orgUsers = org.users;
      orgUsersIds = [];
      org.users.forEach((element) => {
        orgUsersIds.push(element.id);
      });
      // then find all users, find the difference - complicated
      // Model.find({ where: { name: 'foo' }, limit: 10, skip: 10 });
      const allUsers = await User.find({ where: { id: { '!=': orgUsersIds } }, limit: req.query.limit, skip: req.query.skip });
      // sails.log('allUsers', allUsers)

      return res.status(200).json(allUsers);
    }


    const query = {};

    // add username to the query
    if (req.query.username) {
      query.username = req.query.username;
    }

    if(req.query.id)
    {
      query.id = req.query.id;
    }

    // generic all - all users
    const all = await User.find(query).populate('organizations');

    // debug - keep
    // sails.log('total user count = ', all)

    return res.status(200).json(all);
  },

  async getDirectors(req, res) {
    sails.log('getDirectors');

    const directors = await User.find({ accessLevel: { '>=': 2 } });

    sails.log('directors', directors);

    return res.status(200).json(directors);
  },
  async getOrgUsers(req, res) {
    sails.log('getOrgUsers', req.params);

    const query = {};
    query.organizationID = req.params.orgID;

    const org = await Organization.findOne(query).populate('users');

    sails.log('org', org);

    const { users } = org;

    sails.log('users', users);

    return res.status(200).json(users);
  },

};
