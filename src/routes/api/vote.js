import { Router } from "express";

import * as VoteController from '../../controllers/proposal/votes.js';
import { validateCreateVote } from '../../validators/votes.js'

const router = new Router();

router.post('/',
  validateCreateVote,
  VoteController.createVote)

export default router;
