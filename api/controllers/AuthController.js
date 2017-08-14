/**
 * AuthController
 *
 * @description :: Server-side logic for managing auths
 * @help        :: See http://links.sailsjs.org/docs/controllers
 */

module.exports = {
  index: function (req, res) {

    sails.log("index")

    var email = req.param('email');
    var password = req.param('password');

    if (!email || !password) {
      return res.json(401, { err: 'email and password required' });
    }

    Users.findOne({ email: email }, function (err, user) {
      if (!user) {
        return res.json(401, { err: 'invalid email or password' });
      }

      Users.comparePassword(password, user, function (err, valid) {
        if (err) {
          return res.json(403, { err: 'forbidden' });
        }

        if (!valid) {
          return res.json(401, { err: 'invalid email or password' });
        } else {
          res.json({
            user: user,
            token: jwToken.issue({ id: user.id })
          });
        }
      });
    })
  }
};