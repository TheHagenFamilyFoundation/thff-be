import { Router } from "express";

import * as ProposalController from '../../controllers/proposal/proposals.js';
import { validateGetProposal, validateGetProposals, validatePatchProposals } from '../../validators/proposals.js'
import { injectProposal } from "../../middlewares/model-injections.js";

const router = new Router();

router.get('/my-proposals-exists',
  ProposalController.getMyProposalsExists)
router.get('/my-proposals',
  ProposalController.getMyProposals)
router.get('/my-drafts',
  ProposalController.getMyDrafts)
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
/** Mongo `_id` (composer refetch, autosave status); must stay after literal paths like `/my-drafts`. */
router.get('/:id',
  validateGetProposal,
  ProposalController.getProposal)
router.put('/archive/:id',
  ProposalController.archiveProposal)
router.put('/sponsor/:id',
  validatePatchProposals,
  ProposalController.sponsorProposal)
router.put('/:id',
  validatePatchProposals,
  ProposalController.updateProposal)
router.delete('/:id',
  ProposalController.deleteMyProposal)
router.post('/',
  //TODO: validate needs to be created
  // validateCreateProposal,
  ProposalController.createProposal)

export default router;
