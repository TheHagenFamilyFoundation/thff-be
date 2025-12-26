import { validationResult } from "express-validator";

import { Proposal } from "../../models/index.js";
import { Organization, User } from "../../models/index.js";
import { generateCode } from "../../utils/util.js";
import Logger from "../../utils/logger.js";
import { sendEmailWithTemplate } from "../email/email.js";
import { submittedProposal } from "../../views/proposal.js";

export const createProposal = async (req, res) => {
  Logger.info(`creating proposal`);

  const errors = validationResult(req);

  if (!errors.isEmpty()) {
    Logger.error(`We have Errors: ${errors.array()}`)
    return res.status(422).json({ error: errors.array() });
  }

  try {
    const { decoded, body } = req;
    console.log('decoded', decoded);
    //id is orgId
    const { proposal, orgID } = body;

    console.log('proposal', proposal);
    console.log('orgID', orgID);
    let newID = generateCode();
    proposal.proposalID = newID;
    proposal.organization = orgID;
    console.log('after code proposal', proposal);
    const newProposal = await Proposal.create(proposal);
    if (!newProposal) {
      Logger.error('Error creating proposal');
      return res.status(500).send({ code: "PROP001", message: 'Error creating proposal' });
    }
    console.log('newProposal', newProposal);
    //add to organization
    const organization = await Organization.findOne({ _id: orgID });

    if (!organization) {
      Logger.error(`Error creating proposal for organization ${orgID}`);
      return res.status(500).send({ code: "PROP001", message: `Error creating proposal for organization ${orgID}` });
    }

    organization.proposals.push(newProposal._id);
    await organization.save();

    const userID = decoded.userID;
    const user = await User.findOne({ _id: userID });

    const data = {
      email: user.email,
      projectTitle: proposal.projectTitle
    };

    const to = user.email;
    const subject = 'Thank You For Submitting A Proposal';

    try {
      await sendEmailWithTemplate(to, subject, submittedProposal, data);
      Logger.info(`Proposal submission email sent successfully to ${to}`);
    } catch (emailError) {
      Logger.error(`Failed to send proposal submission email to ${to}:`, emailError);
      // Continue even if email fails - proposal is still created
    }

    return res.status(200).send(newProposal);
  }
  catch (e) {
    console.log('e', e);
    Logger.error('Error creating proposal');
    return res.status(500).send({ code: "PROP001", message: e.message });
  }
}

export const updateProposal = async (req, res) => {
  console.log('inside updateProposal');
  const errors = validationResult(req);

  if (!errors.isEmpty()) {
    Logger.error(`We have Errors: ${errors.array()}`)
    return res.status(422).json({ error: errors.array() });
  }
  const { id } = req.params;
  const updatePayload = req.body;
  console.log('updatePayload', updatePayload);

  try {

    let updatedProposal = null;
    console.log('Object.keys(updatePayload)', Object.keys(updatePayload));
    const updatedFields = Object.keys(updatePayload);
    console.log('first field', updatedFields[0]);
    if (updatedFields.length === 1) {
      //single update
      const proposal = await Proposal.findOne({ _id: id });
      console.log('proposal[updatedFields[0]]', proposal[updatedFields[0]]);
      console.log('updatePayload[0]', updatePayload[0]);
      proposal[updatedFields[0]] = updatePayload[updatedFields[0]];
      await proposal.save();
      updatedProposal = proposal;
    } else {
      console.log('updatePayload');
      await Proposal.findOneAndUpdate(
        { _id: id },
        updatePayload);

      updatedProposal = await Proposal.findOne({ _id: id });

    }
    console.log('returning updatedProposal', updatedProposal);
    return res.status(200).json({
      message: "Proposal Updated",
      proposal: updatedProposal,
    });

  }
  catch (e) {
    console.log('e', e);
    Logger.error(`Error updating proposal ${id}`);
    return res.status(500).json(e.message);
  }

}

export const getProposal = async (req, res) => {

  Logger.info('inside getProposal');
  const errors = validationResult(req);

  if (!errors.isEmpty()) {
    Logger.error(`We have Errors: ${errors.array()}`)
    return res.status(422).json({ error: errors.array() });
  }

  const { id } = req.params;

  try {

    const proposal = await Proposal.findOne({ _id: id })
      .populate('organization')
      .populate('sponsor');

    Logger.info(`Returning proposal ${proposal}`);
    return res.status(200).json(proposal);

  }
  catch (e) {
    console.log('e', e);
    Logger.error(`Error getting proposal ${id}`);
    return res.status(500).json(e.message);
  }

}

//get proposals - plural
export const getProposals = async (req, res) => {
  Logger.info('Inside getProposals');
  const errors = validationResult(req);

  if (!errors.isEmpty()) {
    Logger.error(`We have Errors: ${errors.array()}`)
    return res.status(422).json({ error: errors.array() });
  }

  if (req.query.proposalID || req.query.id) {

    const query = req.query.id ? { _id: req.query.id } : { proposalID: req.query.proposalID }
    //single get proposal
    const proposal = await Proposal.findOne(query)
      .populate('organization')
      .populate('votes')
      .populate('sponsor')

    console.log('returning proposal', proposal);
    return res.status(200).json(proposal);

  } else {


    let { year, org, limit, skip, filter, sort, dir } = req.query;

    try {
      // Define start and end dates for the year
      const startDate = new Date(`${year}-01-01T00:00:00.000Z`);
      const endDate = new Date(`${year}-12-31T23:59:59.999Z`);
      let query = {
        createdAt: {
          $gte: startDate,
          $lte: endDate
        },
      };

      if (org) {
        query = { ...query, organization: org };
      }

      if (filter && filter.length !== 0) {
        query = { ...query, projectTitle: { $regex: filter.toLowerCase(), $options: 'i' } };
      }

      let proposals = await Proposal.find(query)
        .populate('organization')
        .populate('votes')
        .populate('sponsor');

      //sort
      //for notes
      // ASC  -> a.length - b.length
      // DESC -> b.length - a.length
      switch (sort) {

        case 'projectTitle':
          if (dir === 'asc') {
            proposals.sort((a, b) => b.projectTitle.localeCompare(a.projectTitle));
          }
          else {
            proposals.sort((a, b) => a.projectTitle.localeCompare(b.projectTitle))
          }
          break;
        case 'organization': //sort by organization name
          if (dir === 'asc') {
            proposals.sort((a, b) => b.organization?.name.localeCompare(a.organization?.name));
          }
          else {
            proposals.sort((a, b) => a.organization?.name.localeCompare(b.organization?.name))
          }
          break;
        case 'amountRequested':
          proposals.sort(function (a, b) {
            return dir === 'asc' ? (a.amountRequested - b.amountRequested) : (b.amountRequested - a.amountRequested);
          });
          break;
        case 'totalProjectCost':
          proposals.sort(function (a, b) {
            return dir === 'asc' ? (a.totalProjectCost - b.totalProjectCost) : (b.totalProjectCost - a.totalProjectCost);
          });
          break;
        case 'sponsor':
          console.log('sorting by sponsors');
          proposals.sort(function (a, b) {
            let aSponsor = ((typeof a.sponsor !== 'undefined') && a.sponsor !== null) ? 1 : 0;
            let bSponsor = ((typeof b.sponsor !== 'undefined') && b.sponsor !== null) ? 1 : 0;
            return dir === 'asc' ? (aSponsor - bSponsor) : (bSponsor - aSponsor);
          });
          break;
        case 'votes':
          proposals.sort(function (a, b) {
            return dir === 'asc' ? (a?.votes.length - b?.votes.length) : (b?.votes.length - a?.votes.length);
          });
          break;
        case 'score':
          console.log('sorting by score');
          proposals.sort(function (a, b) {
            let aScore = (typeof a.score !== 'undefined') ? a.score : 0;
            let bScore = (typeof b.score !== 'undefined') ? b.score : 0;
            return dir === 'asc' ? (aScore - bScore) : (bScore - aScore);
          });
          break;
        case 'createdOn':
          proposals.sort(function (a, b) {
            return dir === 'asc' ? (new Date(a.createdAt) - new Date(b.createdAt)) : (new Date(b.createdAt) - new Date(a.createdAt));
          });
          break;
      }

      //skip and limit
      let props = proposals.slice(skip, +skip + +limit);
      return res.status(200).json(props);

    } catch (e) {
      console.log('e', e);
      Logger.error('Error retrieving proposals');
      return res.status(400).send({ code: "PROP003", message: e.message });
    }
  }
}

export const countProposals = async (req, res) => {
  try {
    let { year, org, filter } = req.query;

    // Define start and end dates for the year
    const startDate = new Date(`${year}-01-01T00:00:00.000Z`);
    const endDate = new Date(`${year}-12-31T23:59:59.999Z`);
    let query = {
      createdAt: {
        $gte: startDate,
        $lte: endDate
      },
    };

    if (org) {
      query = { ...query, organization: org };
    }

    if (filter && filter.length !== 0) {
      query = { ...query, projectTitle: { $regex: filter.toLowerCase(), $options: 'i' } };
    }
    let count = await Proposal.find(query);
    return res.status(200).json(count.length);
  }
  catch (err) {
    Logger.error(`Error Retrieving Proposal Count: ${err}`);
    return res.status(400).send({ code: "PROP002", message: err.message });
  }
}

export const sponsorProposal = async (req, res) => {
  try {
    const { id } = req.params;
    const { sponsor } = req.body;

    let proposal = await Proposal.findOne({ _id: id });
    proposal.sponsor = sponsor;
    await proposal.save();
    return res.status(200).json(proposal);
  }
  catch (err) {
    Logger.error(`Error Sponsoring Proposal: ${err}`);
    return res.status(400).send({ code: "PROP007", message: err.message });
  }
}
