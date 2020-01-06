/**
 * GrantController
 *
 * @description :: Server-side logic for managing grants
 * @help        :: See http://sailsjs.org/#!/documentation/concepts/Controllers
 */

module.exports = {

  async getGrantsTotal(req, res) {
    // find all grants
    // total the amount awarded

    const grants = await Grant.find();

    sails.log.verbose('grants', grants);

    let grantTotal = 0;

    grants.forEach((grant) => {
      sails.log.info('before grantTotal', grantTotal);
      sails.log.info('amount', grant.Amount);
      sails.log.info('typeof amount', typeof grant.Amount);
      sails.log.info('grant', grant);
      grantTotal += grant.Amount;
      sails.log.info('after grantTotal', grantTotal);
    });

    // debug
    const message = {
      grantTotal,
    };

    return res.status(200).send(message);
  },

  async getGrantsCount(req, res) {
    // generic total - all grants
    const grantCount = await Grant.count({});

    // debug - keep
    sails.log.debug('grant count = ', grantCount);
    sails.log.info('grant count = ', grantCount);

    const message = {
      grantCount,
    };

    return res.status(200).json(message);
  },

};
