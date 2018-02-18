/**
 * UserController
 *
 * @description :: Server-side logic for managing users
 * @help        :: See http://links.sailsjs.org/docs/controllers
 */

module.exports = {
    create: function (req, res) {

        sails.log("user create")

        if (req.body.password !== req.body.confirmPassword) {
            return res.json(401, { err: 'Password doesn\'t match, What a shame!' });
        }

        sails.log(req.body.username);

        User.create(req.body).exec(function (err, user) {

            sails.log("User.create")

            if (err) {
                return res.json(err.status, { err: err });
            }
            // If user created successfuly we return user and token as response
            if (user) {
                // NOTE: payload is { id: user.id}
                res.json(200, { user: user, token: jwToken.issue({ id: user.id }) });
            }
        });
    }
    ,
    UserNameExists: function (req, res) {

        sails.log(req.query.username);

        User.find({
            username: req.query.username
        }).exec(function (err, userfound) {
            if (err) {
                return res.json(err.status, { err: err });
            }

            if (userfound) {
                sails.log(userfound);

                if (userfound.length > 0) {
                    sails.log("user is found");
                    return res.json({ userfound: true });
                }
                else {
                    sails.log("user is not found");
                    return res.json({ userfound: false });
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
                return res.json(err.status, { err: err });
            }

            if (emailfound) {
                sails.log(emailfound);

                if (emailfound.length > 0) {
                    sails.log("email is found");
                    return res.json({ emailfound: true });
                }
                else {
                    sails.log("email is not found");
                    return res.json({ emailfound: false });
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
                return res.json(err.status, { err: err });
            }

            if (emailfound) {

                if (emailfound.length > 0) {
                    sails.log("email is found");
                    //return res.json({ emailfound: true });
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
                            //res.send(200);
                            //return res.json({ resetCodeCreated: true, resetCode: text, resetTime: now });
                            return res.json({ resetCodeCreated: true, resetCode: text });

                        })

                }
                else {
                    sails.log("email is not found");
                    return res.json({ resetCodeCreated: false });
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
                return res.json(err.status, { err: err });
            }

            if (validresetCode) {

                //debug
                sails.log("validresetCode");
                sails.log(validresetCode);
                sails.log("validresetCode[0].resetTime");
                sails.log(validresetCode[0].resetTime);

                if (validresetCode.length > 0) {
                    sails.log("reset code is valid");

                    var now = new Date();
                    var TWENTYFOUR_HOURS = 60 * 60 * 1000 * 24;

                    sails.log(now);
                    sails.log(validresetCode[0].resetTime);
                    sails.log(TWENTYFOUR_HOURS)
                    

                    if (now - validresetCode[0].resetTime < TWENTYFOUR_HOURS) {

                        sails.log("reset time is valid");

                        return res.json({ validresetCode: true });
                    }
                    else {

                        sails.log("reset time is invalid");

                        return res.json({ validresetCode: false });
                    }


                }
                else {
                    sails.log("reset code is not valid");
                    return res.json({ validresetCode: false });
                }
            }//end of resetCode if

        });

    }//end of ResetCodeCheck



};
