/**
 * AuthController
 *
 * @description :: Server-side logic for managing auths
 * @help        :: See http://links.sailsjs.org/docs/controllers
 */

module.exports = {

  login: function (req, res) {

    sails.log("Login")

    var username = req.body.username;
    var password = req.body.password;

    if (!username || !password) {
      return res.status(400).json({ err: 'username and password required', message: 'Username and Password required' });
    }

    var query = {};
    query.username = username;

    User.findOne(query, function (err, user) {

      if (!user) {
        return res.status(400).json({ err: 'invalid username or password', message: 'Invalid Username or Password' });
      }

      User.comparePassword(password, user, function (err, valid) {
        if (err) {
          return res.status(err.status).json({ err: 'forbidden' });
        }

        if (!valid) {
          return res.status(400).json({ err: 'invalid username or password', message: 'Invalid Username or Password' });
        } else {
          res.status(200).json({
            user: user,
            token: jwToken.issue({ id: user.id })
          });
        }
      });
    })
  },

  authTest: function (req, res) {

    sails.log('AuthTest')

    return res.status(200).json(
      {
        "employees": [
          { "firstName": "John", "lastName": "Doe" },
          { "firstName": "Anna", "lastName": "Smith" },
          { "firstName": "Peter", "lastName": "Jones" }
        ]
      })

  }

};