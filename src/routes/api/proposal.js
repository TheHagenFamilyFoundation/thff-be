import { Router } from "express";

import * as ProposalController from '../../controllers/proposal/proposals.js';
import { validateGetProposal, validateGetProposals, validatePatchProposals } from '../../validators/proposals.js'
import { injectProposal } from "../../middlewares/model-injections.js";

const router = new Router();

router.get('/',
  validateGetProposals,
  ProposalController.getProposals)
router.get('/count',
  validateGetProposals,
  ProposalController.countProposals)
router.get('/propID/:propID',
  validateGetProposal,
  injectProposal,
  ProposalController.getProposal)
router.put('/sponsor/:id',
  validatePatchProposals,
  ProposalController.sponsorProposal)
router.put('/:id',
  validatePatchProposals,
  ProposalController.updateProposal)
router.post('/',
  //TODO: validate needs to be created
  // validateCreateProposal,
  ProposalController.createProposal)

export default router;
