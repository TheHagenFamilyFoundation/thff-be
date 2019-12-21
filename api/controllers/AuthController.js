/**
 * AuthController
 *
 * @description :: Server-side logic for managing auths
 * @help        :: See http://links.sailsjs.org/docs/controllers
 */

module.exports = {
  login(req, res) {
    sails.log('User trying to login... email: ', req.body.email);

    const { email } = req.body;
    const { password } = req.body;

    if (!email || !password) {
      return res.status(400).json({
        err: 'email and password required',
        message: 'Email and Password required',
      });
    }

    const query = {};
    query.email = email;

    User.findOne(query, (err, user) => {
      if (!user) {
        return res.status(400).json({
          err: 'invalid email or password',
          message: 'Invalid Email or Password',
        });
      }

      User.comparePassword(password, user, (err, valid) => {
        if (err) {
          return res.status(err.status).json({ err: 'forbidden' });
        }

        if (!valid) {
          return res.status(400).json({
            err: 'invalid email or password',
            message: 'Invalid Email or Password',
          });
        }
        res.status(200).json({
          user,
          token: jwToken.issue({ id: user.id }),
        });
      });
    });
  },

  authTest(req, res) {
    sails.log('AuthTest');

    return res.status(200).json({
      employees: [
        { firstName: 'John', lastName: 'Doe' },
        { firstName: 'Anna', lastName: 'Smith' },
        { firstName: 'Peter', lastName: 'Jones' },
      ],
    });
  },
};
