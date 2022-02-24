/**
 * AuthController
 *
 * @description :: Server-side logic for managing auths
 * @help        :: See http://links.sailsjs.org/docs/controllers
 */

module.exports = {
  login(req, res) {
    sails.log('User trying to login... email: ', req.body.email);

    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({
        err: 'email and password required',
        message: 'Email and Password required',
      });
    }

    const query = {};
    query.email = email.toLowerCase();

    // sails.log.debug(query);

    User.findOne(query, (err, user) => {

      if (!user) {
        return res.status(400).json({
          err: 'invalid email or password',
          message: 'Invalid Email or Password',
        });
      }

      if (user.length > 1) {
        sails.log.error('error');
        sails.log.error(err);
      }

      User.comparePassword(password, user, (err2, valid) => {
        if (err2) {
          return res.status(err2.status).json({ err: 'forbidden' });
        }


        if (!valid) {
          sails.log.debug('error not valid password');
          const message = {
            err: 'invalid email or password',
            message: 'Invalid Email or Password',
          };
          sails.log.debug('returning ', message);
          return res.status(400).json(message);
        }

        sails.log.debug('success');

        return res.status(200).json({
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
