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

    }

};
