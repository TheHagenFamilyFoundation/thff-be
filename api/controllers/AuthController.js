/**
 * AuthController
 *
 * @description :: Server-side logic for managing auths
 * @help        :: See http://links.sailsjs.org/docs/controllers
 */

module.exports = {
  index: function (req, res) {

    sails.log("index - Login")

    var username = req.body.username;
    var password = req.body.password;

    if (!username || !password) {
      return res.json(401, { err: 'username and password required' });
    }

    User.findOne({ username: username }, function (err, user) {
      if (!user) {
        return res.json(401, { err: 'invalid username or password' });
      }

      User.comparePassword(password, user, function (err, valid) {
        if (err) {
          return res.json({ err: 'forbidden' });
        }

        if (!valid) {
          return res.json({ err: 'invalid email or password', message: 'Invalid Username or Password' });
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