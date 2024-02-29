import Logger from "../utils/logger.js";

import { Organization, Proposal } from "../models/index.js";

export const injectOrganization = async (req, res, next) => {

  const { orgID } = req.params;

  try {
    const organization = await Organization.findOne({ organizationID: orgID })

    if (!organization) {
      //error
      Logger.error(`Organization ${orgID} not found`);
      Logger.error(`Error retrieving organization with orgID: ${orgID}`);
      return res.status(500).json({ code: 'ORG003', message: `Error retrieving organization with orgID: ${orgID}` });
    }

    //set req.params to orgId
    req.params = { id: organization._id.toString() };
    console.log('req.params.id', req.params.id);
    next();
  } catch (e) {
    console.log('e', e);
    Logger.error(`Error retrieving organization with orgID: ${orgID}`);
    return res.status(500).json(e.message);
  }
}

export const injectProposal = async (req, res, next) => {

  const { propID } = req.params;
  console.log('injectProposal', propID);

  try {
    const proposal = await Proposal.findOne({ proposalID: propID })

    if (!proposal) {
      //error
      Logger.error(`Proposal ${propID} not found`);
      Logger.error(`Error retrieving proposal with propID: ${propID}`);
      return res.status(500).json({ code: 'ORG003', message: `Error retrieving proposal with propID: ${propID}` });
    }

    //set req.params to propId
    req.params = { id: proposal._id.toString() };
    console.log('req.params.id', req.params.id);
    next();
  } catch (e) {
    console.log('e', e);
    Logger.error(`Error retrieving proposal with propID: ${propID}`);
    return res.status(500).json(e.message);
  }
}
