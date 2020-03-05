/**
 * SubmissionYearController
 *
 * @description :: Server-side actions for handling incoming requests.
 * @help        :: See https://sailsjs.com/docs/concepts/actions
 */

module.exports = {

  async create(req, res, next) {
    sails.log('submission year create');

    sails.log('req.body', req.body);

    const subYear = req.body; // submission year

    // create subID
    let text = '';
    const possible = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';

    for (let i = 0; i < 5; i++) {
      text += possible.charAt(Math.floor(Math.random() * possible.length));
    }

    const subID = text;
    // add subID to subyear object

    subYear.subID = subID;

    const query = {
      submitted: true,
      submissionYear: null, // unclaimed submissionYears
    };

    const lois = await LOI.find(query);

    subYear.lois = [];
    lois.forEach((loi) => {
      subYear.lois.push(loi.id);
    });

    const newSubYear = await SubmissionYear.create(subYear);

    return res.json({ status: true, result: newSubYear });
  },

  // connected with LOI Controller
  async openFullProposalPortal(data) {
    sails.log('openFullProposalPortal', data);

    const query = {
      id: data.id,
    };

    // debugging
    // var sy = await SubmissionYear.findOne(query);

    const sy = await SubmissionYear.update(query)
      .set({
        fpPortal: true,
      })
      .fetch();

    sails.log('sy', sy); // debuggin

    const result = true;

    return result;
  },

  // //connected with LOI Controller
  async closeFullProposalPortal(data) {
    sails.log('closeFullProposalPortal');

    const query = {
      id: data.id,
    };

    // debugging
    // var sy = await SubmissionYear.findOne(query);

    const sy = await SubmissionYear.update(query)
      .set({
        fpPortal: false,
      })
      .fetch();

    sails.log('sy', sy); // debugging

    const result = true;

    return result;
  },

  async closeSubmissionYear(req, res, next) {
    sails.log('closeFullProposalPortal', req.body);

    const query = {
      id: req.body.id,
    };

    // debugging
    // var sy = await SubmissionYear.findOne(query);

    const sy = await SubmissionYear.update(query)
      .set({
        active: false, // deactivate the submission year
      })
      .fetch();

    sails.log('sy', sy); // debugging

    // send code 200
    return res.status(200).json({ status: true, result: sy });
  },


};
