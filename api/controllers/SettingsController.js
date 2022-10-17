/**
 * SettingsController
 *
 * @description :: Server-side actions for handling incoming requests.
 * @help        :: See https://sailsjs.com/docs/concepts/actions
 */

module.exports = {
  async updateSetting(req, res) {
    sails.log.debug("updateSetting", req.body);

    Settings.findOne({
      userID: req.body.userID,
    }).exec((err, settingsFound) => {
      if (err) {
        return res.status(err.status).json({ reset: false });
      }

      if (settingsFound) {
        //update

        Settings.update(
          {
            userID: req.body.userID,
          },
          {
            scheme: req.body.scheme,
          }
        ).exec((err2, setting) => {
          if (err2) {
            return res.status(err2.status).json({ reset: false });
          }

          return res
            .status(200)
            .json({ code: "SET001", message: "Setting updated" }); //error code
        });
      } else {
        //create
        Settings.create({
          userID: req.body.userID,
          scheme: req.body.scheme,
        }).exec((err2, setting) => {
          if (err2) {
            return res.status(err2.status).json({ reset: false });
          }

          return res
            .status(200)
            .json({ code: "SET002", message: "Setting created" }); //error code
        });
      }
    });
  },
};
