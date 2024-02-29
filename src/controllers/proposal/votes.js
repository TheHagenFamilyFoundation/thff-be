import { validationResult } from "express-validator";

import Logger from "../../utils/logger.js";
import { calculatePropScore } from "./util.js";
import { Proposal } from "../../models/index.js";
import { Vote } from "../../models/index.js";

export const createVote = async (req, res) => {
  Logger.info(`Inside Create Vote`);

  const errors = validationResult(req);

  if (!errors.isEmpty()) {
    Logger.error(`We have Errors: ${errors.array()}`)
    return res.status(422).json({ error: errors.array() });
  }

  try {

    const { prop, userID, vote } = req.body;
    console.log('req.body', req.body);

    //remove from proposal
    const proposal = await Proposal.findOne({ _id: prop });
    const votes = proposal.votes.filter((id) => {
      return id !== prop;
    });
    proposal.votes = votes;
    proposal.score = calculatePropScore(votes);
    await proposal.save();
    //delete old vote
    await Vote.deleteOne({ _id: prop, userID });

    //create new one
    const newVote = await Vote.create({ prop, userID, vote })
    //add vote to the proposal
    proposal.votes.push(newVote._id);
    await proposal.save();

    const returnVote = await Vote.findOne({ _id: newVote._id }).populate('prop');

    return res.status(200).send(returnVote);
  }
  catch (e) {
    console.log('e', e);
    Logger.error('Error creating vote');
    return res.status(500).send({ code: "PROP001", message: e.message });
  }
}
