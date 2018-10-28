/**
 * UserController
 *
 * @description :: Server-side logic for managing users
 * @help        :: See http://links.sailsjs.org/docs/controllers
 */

var bcrypt = require('bcrypt-nodejs');

const saltRounds = 10;

module.exports = {
    create: function (req, res) {

        sails.log("user create")

        if (req.body.password !== req.body.confirmPassword) {
            return res.status(401).json({ err: 'Password doesn\'t match, What a shame!' });
        }

        sails.log('req.body', req.body);

        bcrypt.genSalt(saltRounds, function (err, salt) {
            if (err) return res.status(err.status).json({ err: err });

            bcrypt.hash(req.body.password, salt, null, function (err, hash) {
                if (err) return res.status(err.status).json({ err: err });

                sails.log('hash', hash)

                req.body.encryptedPassword = hash;

                //})
                sails.log('req.body', req.body);


                User.create(req.body).exec(function (err, user) {

                    sails.log("User.create")

                    if (err) {
                        return res.status(err.status).json({ err: err });
                    }
                    // If user created successfuly we return user and token as response
                    if (user) {
                        // NOTE: payload is { id: user.id}
                        res.status(200).json({ user: user, token: jwToken.issue({ id: user.id }) });
                    }

                })

            })

        });
    }
    ,
    UserNameExists: function (req, res) {

        sails.log(req.query.username);

        User.find({
            username: req.query.username
        }).exec(function (err, userfound) {
            if (err) {
                return res.status(err.status).json({ err: err });
            }

            if (userfound) {
                sails.log(userfound);

                if (userfound.length > 0) {
                    sails.log("user is found");
                    return res.status(200).json({ userfound: true });
                }
                else {
                    sails.log("user is not found");
                    return res.status(200).json({ userfound: false });
                }
            }//end of userfound if

        });

    }//end of UserNameExists

    ,
    EmailExists: function (req, res) {

        sails.log(req.query.email);

        User.find({
            email: req.query.email
        }).exec(function (err, emailfound) {
            if (err) {
                return res.status(err.status).json({ err: err });
            }

            if (emailfound) {
                sails.log(emailfound);

                if (emailfound.length > 0) {
                    sails.log("email is found");
                    return res.status(200).json({ emailfound: true });
                }
                else {
                    sails.log("email is not found");
                    return res.status(200).json({ emailfound: false });
                }
            }//end of emailfound if

        });

    }//end of EmailExists
    ,

    CreateResetCode: function (req, res) {
        sails.log("Create Reset Code")

        const user = req.body;

        User.find({
            email: user.email
        }).exec(function (err, emailfound) {
            if (err) {
                return res.status(err.status).json({ err: err });
            }

            if (emailfound) {

                if (emailfound.length > 0) {
                    sails.log("email is found");
                    //debug
                    sails.log(emailfound[0].id);

                    var text = "";
                    var possible = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";

                    for (var i = 0; i < 5; i++)
                        text += possible.charAt(Math.floor(Math.random() * possible.length));

                    sails.log(text)

                    var now = new Date();

                    sails.log(now);

                    User.update(
                        { id: emailfound[0].id },
                        {
                            //debug
                            resetCode: text,
                            resetPassword: true,
                            resetTime: now
                        }
                    )
                        .exec(function (err, emailfound) {

                            sails.log(emailfound)
                            return res.status(200).json({ resetCodeCreated: true, resetCode: text });

                        })

                }
                else {
                    sails.log("email is not found");
                    return res.status(401).json({ resetCodeCreated: false });
                    //res.send(404);
                }
            }//end of emailfound if

        });

    }//end of CreateResetCode
    ,
    ResetCodeCheck: function (req, res) {

        sails.log(req.query.resetCode);

        User.find({
            resetCode: req.query.resetCode
        }).exec(function (err, validresetCode) {
            if (err) {
                return res.status(err.status).json({ err: err });
            }

            if (validresetCode) {

                if (validresetCode.length > 0) {
                    sails.log("reset code is valid"); //reset code was found

                    if (validresetCode[0].resetPassword) {

                        //set in the db the resetPassword to false
                        User.update({
                            resetCode: req.query.resetCode
                        }, {
                                resetPassword: false
                            }
                        ).exec(function (err, user) {
                            if (err) {
                                return res.status(err.status).json({ reset: false });
                            }

                            //now for checking the resetTime

                            var now = new Date();
                            var TWENTYFOUR_HOURS = 60 * 60 * 1000 * 24;

                            sails.log(now);
                            sails.log(user[0].resetTime);
                            sails.log(TWENTYFOUR_HOURS)

                            if (now - user[0].resetTime < TWENTYFOUR_HOURS) {

                                sails.log("reset time is valid");

                                return res.status(200).json({ validresetCode: true, message: "reset time is valid" });
                            }
                            else {

                                sails.log("reset time is invalid");

                                //reset time is invalid
                                return res.status(401).json({ validresetCode: false, message: "Reset password link has expired. Please try again." });
                            }
                        })
                    }
                    else {
                        //resetPassword is false
                        return res.status(401).json({ validresetCode: false, message: "Reset code has already been used. Please try again." });
                    }

                }
                else {
                    sails.log("reset code is invalid");
                    return res.status(401).json({ validresetCode: false, message: "Reset code is invalid." });
                }
            }//end of resetCode if

        });

    }//end of ResetCodeCheck
    ,
    setNewPassword: function (req, res) {

        sails.log("setNewPassword");

        var newPassword = req.body.np;
        var username = req.body.un;

        User.find({
            username: username
        }).exec(function (err, user) {
            if (err) {
                return res.status(err.status).json({ reset: false });
            }

            sails.log("bcrypt gen salting");

            bcrypt.genSalt(10, function (err, salt) {
                if (err) return next(err);

                bcrypt.hash(newPassword, salt, null, function (err, hash) {
                    if (err) return next(err);
                    sails.log("new hash");
                    sails.log(hash);

                    //then set the user password to that hash
                    User.update({
                        id: user[0].id
                    }, {
                            //resetPassword: false,
                            encryptedPassword: hash
                        }
                    ).exec(function (err, user) {
                        if (err) {
                            return res.status(err.status).json({ reset: false });
                        }

                        //sails.log(user);
                        sails.log('Reset Successful')
                        return res.status(200).json({ reset: true, message: "Reset Successful" });
                    })

                })
            })

        })

    }//end of setNewPassword
    ,

    changePassword: function (req, res) {

        sails.log("changePassword");

        sails.log(req.body)

        var currentPassword = req.body.currentPassword;
        var newPassword = req.body.newPassword;
        var username = req.body.username;

        User.find({
            username: username
        }).exec(function (err, user) {
            if (err) {
                return res.status(err).json({ change: false });
            }

            var encrypted = user[0].encryptedPassword;

            //compare current password to the current encrypted password
            //if match then encrypt the new password and set the encrypted new password as the password
            bcrypt.compare(currentPassword, encrypted, function (err, match) {
                if (err) {
                    return res.status(err.status).json({ change: false });
                }

                if (!match) {

                    sails.log('match', match)

                    let message = "Current Password does not match.";
                    return res.status(200).json({ change: false, message: message });
                }

                if (match) {

                    sails.log("bcrypt gen salting");

                    bcrypt.genSalt(10, function (err, salt) {
                        if (err) return res.status(err.status).json({ change: false });

                        bcrypt.hash(newPassword, salt, null, function (err, hash) {
                            if (err) return res.status(err.status).json({ change: false });
                            sails.log("new hash");
                            sails.log(hash);

                            //then set the user password to that hash
                            User.update({
                                id: user[0].id
                            }, {
                                    //resetPassword: false,
                                    encryptedPassword: hash
                                }
                            ).exec(function (err, user) {
                                if (err) {
                                    return res.status(err.status).json({ change: false });
                                }

                                //sails.log(user);
                                sails.log('Change Password Successful')
                                return res.status(200).json({ change: true, message: "Change Password Successful" });
                            })

                        })
                    })
                }
            })

        })

    }//end of changePassword
    ,

    changeEmail: function (req, res) {

        sails.log("changeEmail");

        var newEmail = req.body.email;
        var username = req.body.username;

        sails.log('newEmail', newEmail)

        User.find({
            username: username
        }).exec(function (err, user) {
            if (err) {
                return res.status(err.status).json({ change: false });
            }

            //then set the user password to that hash
            User.update({
                id: user[0].id
            }, {
                    email: newEmail
                }
            ).exec(function (err, user) {
                if (err) {
                    return res.status(err.status).json({ change: false });
                }

                //sails.log(user);
                sails.log('Change Email Successful')
                return res.status(200).json({ change: true, message: "Change Email Successful" });
            })

        })

    }//end of changeEmail

};
