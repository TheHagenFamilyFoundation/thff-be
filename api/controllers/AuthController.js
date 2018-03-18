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
      return res.json({ err: 'username and password required',message: 'Username and Password required' });
    }

    User.findOne({ username: username }, function (err, user) {
      if (!user) {
        return res.json({ err: 'invalid username or password',message: 'Invalid Username or Password' });
      }

      User.comparePassword(password, user, function (err, valid) {
        if (err) {
          return res.json({ err: 'forbidden',message: 'Forbidden' });
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